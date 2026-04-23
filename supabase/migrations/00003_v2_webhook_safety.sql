-- ============================================================
-- Migration 00003: Webhook Safety + Subscription Reset
-- ============================================================

-- 1. Webhook 멱등성 테이블
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
  id text PRIMARY KEY,                -- 외부 결제 이벤트 ID (멱등성)
  event_name text NOT NULL,
  user_id uuid NOT NULL,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_events_user ON public.processed_webhook_events (user_id);

-- 2. reset_credits RPC — 구독 크레딧 리셋 (누적 아닌 교체)
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
  v_old_balance int;
  v_new_balance int;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  -- UPSERT: 없으면 생성, 있으면 리셋
  INSERT INTO public.credits (user_id, service, balance)
  VALUES (p_user_id, 'ft', p_amount)
  ON CONFLICT (user_id, service) DO UPDATE
    SET balance = p_amount
  RETURNING balance INTO v_new_balance;

  -- 감사 기록
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason)
  VALUES (p_user_id, p_amount, v_new_balance, p_reason);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'reset_to', p_amount
  );
END;
$$;

-- 3. spend_credits 개선: 새 사용자 동시 INSERT 충돌 방지
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

    -- 다시 조회 + 잠금
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
