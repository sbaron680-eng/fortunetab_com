-- ============================================================
-- Migration 00014: create_chat_session_atomic RPC
-- ============================================================
--
-- 목적: Phase 1 MVP 세션 생성을 단일 DB 트랜잭션으로 통합.
--
-- 배경 (2026-04-24 정밀 감사 C1):
--   - 00005 가드: `auth.uid() IS NULL OR auth.uid() != p_user_id` → service_role 차단
--   - 00013 REVOKE: spend_credits를 service_role만 EXECUTE 가능
--   → 두 조건이 충돌해 spend_credits는 어느 경로로도 호출 불가능한 데드코드였음.
--
-- 해결: 새 atomic RPC로 credit 차감 + fortune_profiles UPSERT + chat_sessions
-- INSERT + credit_transactions 감사 기록을 한 트랜잭션에서 처리.
-- H1(감사 race) + M2(fortune_snapshot 영속) 동시 해소.
--
-- 보안 모델:
--   - service_role만 EXECUTE 가능 (REVOKE + GRANT)
--   - auth.uid() 검증 없음 — 호출자(Edge Function)가 Bearer JWT로 user 검증 후 user.id
--     를 p_user_id로 전달할 책임. service_role 노출은 Edge Function 내부로 제한.
--   - 트랜잭션 단일성 덕분에 INSERT/UPDATE 중 하나라도 실패 시 전체 롤백 → 수동
--     refund 로직 불필요.

CREATE OR REPLACE FUNCTION public.create_chat_session_atomic(
  p_user_id uuid,
  p_mode text,                    -- 'biz' | 'gen'
  p_title text,
  p_fortune_snapshot jsonb,       -- camelCase whitelist (Edge Function이 pick)
  p_profile jsonb,                -- {birth_date, birth_hour, birth_minute, birth_location, gender}
  p_amount int DEFAULT 5,
  p_max_messages int DEFAULT 30,
  p_locale text DEFAULT 'ko'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance int;
  v_new_balance int;
  v_credit_id uuid;
  v_session_id uuid;
  v_tx_id uuid;
  v_birth_date date;
  v_birth_hour int;
  v_birth_minute int;
  v_birth_location text;
  v_gender text;
BEGIN
  -- ── 1. 유효성 검증 ──────────────────────────────────────────
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'user_id_required');
  END IF;
  IF p_mode NOT IN ('biz', 'gen') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_mode');
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;
  IF p_locale NOT IN ('ko', 'en') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_locale');
  END IF;
  IF p_fortune_snapshot IS NULL OR jsonb_typeof(p_fortune_snapshot) != 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_snapshot');
  END IF;
  IF p_profile IS NULL OR jsonb_typeof(p_profile) != 'object' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_profile');
  END IF;

  -- ── 2. profile jsonb → 개별 필드 추출 (NULL-safe) ──────────
  v_birth_date := (p_profile->>'birth_date')::date;
  IF v_birth_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'birth_date_required');
  END IF;
  v_gender := p_profile->>'gender';
  IF v_gender NOT IN ('male', 'female') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_gender');
  END IF;
  v_birth_hour := NULLIF(p_profile->>'birth_hour', '')::int;
  v_birth_minute := NULLIF(p_profile->>'birth_minute', '')::int;
  v_birth_location := NULLIF(p_profile->>'birth_location', '');

  -- ── 3. credits 행 잠금 + 잔액 확인 ──────────────────────────
  SELECT id, balance INTO v_credit_id, v_balance
  FROM public.credits
  WHERE user_id = p_user_id AND service = 'ft'
  FOR UPDATE;

  IF v_credit_id IS NULL THEN
    INSERT INTO public.credits (user_id, service, balance)
    VALUES (p_user_id, 'ft', 0)
    ON CONFLICT (user_id, service) DO NOTHING;

    SELECT id, balance INTO v_credit_id, v_balance
    FROM public.credits
    WHERE user_id = p_user_id AND service = 'ft'
    FOR UPDATE;
  END IF;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'balance', v_balance,
      'required', p_amount
    );
  END IF;

  -- ── 4. fortune_profiles UPSERT ──────────────────────────────
  INSERT INTO public.fortune_profiles (
    user_id, birth_date, birth_hour, birth_minute, birth_location,
    gender, composite_score, calculated_at, expires_at
  )
  VALUES (
    p_user_id, v_birth_date, v_birth_hour, v_birth_minute, v_birth_location,
    v_gender, p_fortune_snapshot, now(), now() + interval '24 hours'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    birth_date     = EXCLUDED.birth_date,
    birth_hour     = EXCLUDED.birth_hour,
    birth_minute   = EXCLUDED.birth_minute,
    birth_location = EXCLUDED.birth_location,
    gender         = EXCLUDED.gender,
    composite_score = EXCLUDED.composite_score,
    calculated_at  = EXCLUDED.calculated_at,
    expires_at     = EXCLUDED.expires_at;

  -- ── 5. chat_sessions INSERT ────────────────────────────────
  INSERT INTO public.chat_sessions (
    user_id, session_type, status, fortune_snapshot,
    credits_spent, locale, max_messages, title
  )
  VALUES (
    p_user_id, 'conversation', 'active', p_fortune_snapshot,
    p_amount, p_locale, p_max_messages, p_title
  )
  RETURNING id INTO v_session_id;

  -- ── 6. 크레딧 차감 ──────────────────────────────────────────
  v_new_balance := v_balance - p_amount;
  UPDATE public.credits SET balance = v_new_balance WHERE id = v_credit_id;

  -- ── 7. 감사 기록 (session_id 직접 연결 — race 없음) ────────
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, reason, reference_id, reference_type
  )
  VALUES (
    p_user_id, -p_amount, v_new_balance, 'session_start',
    v_session_id, 'chat_session'
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'ok', true,
    'session_id', v_session_id,
    'balance', v_new_balance,
    'tx_id', v_tx_id,
    'max_messages', p_max_messages
  );
END;
$$;

-- ── 권한: service_role 전용 (Edge Function 경유만) ─────────────
REVOKE ALL ON FUNCTION public.create_chat_session_atomic(uuid, text, text, jsonb, jsonb, int, int, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_chat_session_atomic(uuid, text, text, jsonb, jsonb, int, int, text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_chat_session_atomic(uuid, text, text, jsonb, jsonb, int, int, text) TO service_role;

COMMENT ON FUNCTION public.create_chat_session_atomic IS
'Phase 1 MVP 세션 생성 원자 RPC. Edge Function(service_role)에서만 호출. 내부에서 credit + fortune_profile + chat_session + audit를 단일 트랜잭션으로 처리.';
