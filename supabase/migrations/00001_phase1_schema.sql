-- FortuneTab Phase 1 스키마 확장
-- 실행일: 2026-04-03
-- Supabase MCP를 통해 이미 적용됨 (기록용)

-- ============================================================
-- 1. profiles 테이블 컬럼 추가
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'gen'
    CHECK (mode IN ('biz', 'gen')),
  ADD COLUMN IF NOT EXISTS daun_phase text NOT NULL DEFAULT '안정기'
    CHECK (daun_phase IN ('상승기', '안정기', '전환기', '하강기'));

-- ============================================================
-- 2. ft_sessions — 명발굴 세션
-- ============================================================
CREATE TABLE public.ft_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'gen' CHECK (mode IN ('biz', 'gen')),
  fortune_score float,
  daun_phase text CHECK (daun_phase IN ('상승기', '안정기', '전환기', '하강기')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  payment_type text NOT NULL DEFAULT 'single' CHECK (payment_type IN ('single', 'credit', 'subscription')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. credits — 크레딧/포인트 (Phase 2 준비)
-- ============================================================
CREATE TABLE public.credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service text NOT NULL DEFAULT 'ft' CHECK (service IN ('ft', 'sd')),
  balance int NOT NULL DEFAULT 0 CHECK (balance >= 0),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX credits_user_service_idx ON public.credits(user_id, service);

-- ============================================================
-- 4. subscriptions — 구독 (Lemon Squeezy)
-- ============================================================
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service text NOT NULL DEFAULT 'ft' CHECK (service IN ('ft', 'sd')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'single', 'points', 'monthly', 'yearly')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
  ls_subscription_id text UNIQUE,
  ls_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscriptions_user_service_idx ON public.subscriptions(user_id, service);

-- ============================================================
-- 5. 공통: updated_at 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ft_sessions_updated_at
  BEFORE UPDATE ON public.ft_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER credits_updated_at
  BEFORE UPDATE ON public.credits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 6. RLS 정책
-- ============================================================

-- ft_sessions
ALTER TABLE public.ft_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own sessions" ON public.ft_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own sessions" ON public.ft_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.ft_sessions FOR UPDATE USING (auth.uid() = user_id);

-- credits
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credits" ON public.credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own credits" ON public.credits FOR UPDATE USING (auth.uid() = user_id);

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
