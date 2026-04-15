-- FortuneTab v2 스키마 확장
-- 실행일: 2026-04-07
-- AI Chat Session + 크레딧 감사추적 + 운세 캐시

-- ============================================================
-- 1. fortune_profiles — 운세 계산 결과 캐시
-- ============================================================
CREATE TABLE public.fortune_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  birth_date date NOT NULL,
  birth_hour int,            -- 0~23 (null = 모름)
  birth_minute int,          -- 0~59
  birth_location text,       -- 도시명
  birth_lat float,
  birth_lng float,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  saju_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  western_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  composite_score jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 유저당 하나의 프로필만 유지 (UPSERT용)
CREATE UNIQUE INDEX fortune_profiles_user_idx ON public.fortune_profiles(user_id);

-- ============================================================
-- 2. chat_sessions — AI 대화 세션
-- ============================================================
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'conversation'
    CHECK (session_type IN ('conversation', 'report', 'coaching', 'decision')),
  title text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),
  fortune_snapshot jsonb,     -- 세션 시작 시점의 운세 스냅샷
  credits_spent int NOT NULL DEFAULT 0,
  locale text NOT NULL DEFAULT 'ko',
  message_count int NOT NULL DEFAULT 0,
  max_messages int NOT NULL DEFAULT 30,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_sessions_user_idx ON public.chat_sessions(user_id, created_at DESC);

-- ============================================================
-- 3. chat_messages — 대화 메시지
-- ============================================================
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,  -- tokens_used, model, fortune_refs 등
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_session_idx ON public.chat_messages(session_id, created_at ASC);

-- ============================================================
-- 4. credit_transactions — 크레딧 변동 감사추적
-- ============================================================
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount int NOT NULL,           -- +충전, -사용
  balance_after int NOT NULL,    -- 변동 후 잔액
  reason text NOT NULL
    CHECK (reason IN ('purchase', 'session_start', 'extra_messages', 'bonus', 'refund', 'expiry', 'subscription_reset')),
  reference_id uuid,             -- 관련 세션/주문 ID
  reference_type text,           -- 'chat_session', 'order', etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credit_transactions_user_idx ON public.credit_transactions(user_id, created_at DESC);

-- ============================================================
-- 5. updated_at 트리거 (새 테이블)
-- ============================================================
CREATE TRIGGER fortune_profiles_updated_at
  BEFORE UPDATE ON public.fortune_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. RLS 정책
-- ============================================================

-- fortune_profiles
ALTER TABLE public.fortune_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own fortune_profile"
  ON public.fortune_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can upsert own fortune_profile"
  ON public.fortune_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fortune_profile"
  ON public.fortune_profiles FOR UPDATE USING (auth.uid() = user_id);

-- chat_sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own chat_sessions"
  ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own chat_sessions"
  ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat_sessions"
  ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can create messages in own sessions"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.user_id = auth.uid()
    )
  );

-- credit_transactions (읽기 전용 — 쓰기는 RPC로만)
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 7. spend_credits RPC — 원자적 크레딧 차감
-- ============================================================
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
  -- 유효성 검사
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  -- 행 잠금으로 동시성 안전 보장
  SELECT id, balance INTO v_credit_id, v_balance
  FROM public.credits
  WHERE user_id = p_user_id AND service = 'ft'
  FOR UPDATE;

  -- 크레딧 레코드가 없으면 생성
  IF v_credit_id IS NULL THEN
    INSERT INTO public.credits (user_id, service, balance)
    VALUES (p_user_id, 'ft', 0)
    RETURNING id, balance INTO v_credit_id, v_balance;
  END IF;

  -- 잔액 부족 확인
  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'balance', v_balance,
      'required', p_amount
    );
  END IF;

  -- 차감
  v_new_balance := v_balance - p_amount;
  UPDATE public.credits SET balance = v_new_balance WHERE id = v_credit_id;

  -- 감사 기록
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
  VALUES (p_user_id, -p_amount, v_new_balance, p_reason, p_ref_id, p_ref_type);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'spent', p_amount
  );
END;
$$;

-- ============================================================
-- 8. add_credits RPC — 크레딧 충전
-- ============================================================
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
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'amount must be positive');
  END IF;

  -- UPSERT: 없으면 생성, 있으면 증가
  INSERT INTO public.credits (user_id, service, balance, expires_at)
  VALUES (p_user_id, 'ft', p_amount, p_expires_at)
  ON CONFLICT (user_id, service) DO UPDATE
    SET balance = public.credits.balance + p_amount,
        expires_at = COALESCE(p_expires_at, public.credits.expires_at)
  RETURNING balance INTO v_new_balance;

  -- 감사 기록
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, reason, reference_id, reference_type)
  VALUES (p_user_id, p_amount, v_new_balance, p_reason, p_ref_id, p_ref_type);

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'added', p_amount
  );
END;
$$;
