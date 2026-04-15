-- ============================================================
-- Migration 00005: RPC Authorization Guards
-- ============================================================
--
-- SECURITY FIX: spend_credits, reset_credits, extend_session_messages
-- 모두 SECURITY DEFINER로 실행되지만 auth.uid() 검증이 없었음.
-- 인증된 사용자가 타인의 user_id를 전달해 크레딧을 조작할 수 있는 취약점 수정.
--
-- increment_message_count는 이미 p_user_id로 세션 소유권을 검증하므로 OK.

-- 1. spend_credits: auth.uid() != p_user_id 차단
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_ref_id uuid DEFAULT NULL,
  p_ref_type text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance int;
  v_new_balance int;
  v_credit_id uuid;
BEGIN
  -- ★ 인증 검증: 호출자가 본인인지 확인
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  -- 행 잠금으로 동시성 안전 보장
  SELECT id, balance INTO v_credit_id, v_balance
  FROM public.credits
  WHERE user_id = p_user_id AND service = 'ft'
  FOR UPDATE;

  -- 크레딧 레코드가 없으면 생성 (ON CONFLICT로 동시성 안전)
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

  v_new_balance := v_balance - p_amount;
  UPDATE public.credits SET balance = v_new_balance WHERE id = v_credit_id;

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
  VALUES (p_user_id, -p_amount, v_new_balance, p_reason, p_ref_id, p_ref_type);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'spent', p_amount
  );
END;
$$;

-- 2. reset_credits: auth.uid() 검증 추가 (webhook에서 service_role로 호출 시에는 auth.uid()가 NULL)
-- reset_credits는 서버 사이드(service_role)에서만 호출되므로, 일반 유저 호출을 차단
CREATE OR REPLACE FUNCTION public.reset_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text DEFAULT 'subscription_reset'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance int;
BEGIN
  -- ★ 일반 유저(anon key) 호출 차단: reset은 서버에서만 허용
  -- service_role로 호출 시 auth.uid()는 NULL이므로 통과
  -- anon key로 호출 시 auth.uid()가 존재하면 차단
  IF auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized: server-only');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  INSERT INTO public.credits (user_id, service, balance)
  VALUES (p_user_id, 'ft', p_amount)
  ON CONFLICT (user_id, service) DO UPDATE
    SET balance = p_amount
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason)
  VALUES (p_user_id, p_amount, v_new_balance, p_reason);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'reset_to', p_amount
  );
END;
$$;

-- 3. extend_session_messages: auth.uid() 검증 추가
CREATE OR REPLACE FUNCTION public.extend_session_messages(
  p_session_id uuid,
  p_user_id uuid,
  p_extra_messages int,
  p_extra_cost int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_max int;
  v_new_spent int;
BEGIN
  -- ★ 인증 검증: 호출자가 본인인지 확인
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  UPDATE public.chat_sessions
  SET max_messages = max_messages + p_extra_messages,
      credits_spent = credits_spent + p_extra_cost
  WHERE id = p_session_id AND user_id = p_user_id
  RETURNING max_messages, credits_spent INTO v_new_max, v_new_spent;

  IF v_new_max IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'max_messages', v_new_max,
    'credits_spent', v_new_spent
  );
END;
$$;
