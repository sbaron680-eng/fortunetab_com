-- ============================================================================
-- Migration 00007: RPC 인증 하드닝 (보안 감사 2026-04-21)
-- ============================================================================
-- 정밀 점검에서 발견된 CRITICAL/HIGH 취약점 수정:
--
-- P0-2: add_credits RPC — auth.uid() 검증 없음 → 서버 전용으로 락다운
-- P0-6: get_pending_reports_admin — is_admin 체크 없음 → 내부 검증 추가
--
-- 영향: 인증된 아무 사용자나 타인 user_id로 무한 크레딧 충전 or
--       모든 유료 프리미엄 주문의 PII(이메일·이름·사주 데이터) 조회 가능했음.
-- ============================================================================

-- ── 1. add_credits 락다운 ────────────────────────────────────────────────────
-- 서버(service_role) 전용으로 제한. Webhook/관리 도구에서만 호출 가능.
-- 일반 사용자(anon key 또는 authenticated)의 직접 호출 차단.

CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id uuid,
  p_amount int,
  p_reason text,
  p_ref_id uuid DEFAULT NULL,
  p_ref_type text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance int;
BEGIN
  -- ★ 일반 유저(anon/authenticated) 호출 차단 — 서버에서만 허용
  -- service_role로 호출 시 auth.uid()는 NULL이므로 통과
  IF auth.uid() IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized: server-only');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  INSERT INTO public.credits (user_id, service, balance, expires_at)
  VALUES (p_user_id, 'ft', p_amount, p_expires_at)
  ON CONFLICT (user_id, service) DO UPDATE
    SET balance = public.credits.balance + p_amount,
        expires_at = COALESCE(p_expires_at, public.credits.expires_at)
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
  VALUES (p_user_id, p_amount, v_new_balance, p_reason, p_ref_id, p_ref_type);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'added', p_amount
  );
END;
$$;

-- ── 2. get_pending_reports_admin 하드닝 ─────────────────────────────────────
-- 내부에서 profiles.is_admin 검증. 일반 사용자는 forbidden.

CREATE OR REPLACE FUNCTION public.get_pending_reports_admin()
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  saju_data JSONB,
  report_status TEXT,
  paid_at TIMESTAMPTZ,
  days_since_paid INT,
  admin_memo TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ★ 관리자 검증: profiles.is_admin = true 일 때만 조회 허용
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'forbidden: admin access required';
  END IF;

  RETURN QUERY
    SELECT
      o.id AS order_id,
      o.order_number,
      o.user_id,
      (SELECT email FROM auth.users WHERE id = o.user_id) AS user_email,
      (SELECT name FROM public.profiles WHERE id = o.user_id) AS user_name,
      o.saju_data,
      o.report_status,
      o.created_at AS paid_at,
      EXTRACT(DAY FROM (NOW() - o.created_at))::INT AS days_since_paid,
      o.report_admin_memo AS admin_memo
    FROM public.orders o
    WHERE o.report_status IN ('pending', 'preparing')
      AND o.status IN ('paid', 'completed')
    ORDER BY o.created_at ASC;
END;
$$;

-- 권한은 유지 (authenticated에 EXECUTE — 단, 함수 내부 is_admin 체크로 걸러짐)
GRANT EXECUTE ON FUNCTION public.get_pending_reports_admin() TO authenticated;
