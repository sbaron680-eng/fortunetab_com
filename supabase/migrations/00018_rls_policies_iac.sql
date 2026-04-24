-- 00018_rls_policies_iac.sql
-- S1-3: RLS-as-code for orders / order_items / fortune_purchases / profiles.
-- Captures policies that existed only in the remote DB (initial dashboard setup)
-- so Git becomes the single source of truth. Idempotent.

-- orders ---------------------------------------------------------------------
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 주문 조회" ON public.orders;
CREATE POLICY "본인 주문 조회"
  ON public.orders
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 주문 생성" ON public.orders;
CREATE POLICY "본인 주문 생성"
  ON public.orders
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "관리자 전체 주문 조회" ON public.orders;
CREATE POLICY "관리자 전체 주문 조회"
  ON public.orders
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

DROP POLICY IF EXISTS "관리자 주문 상태 수정" ON public.orders;
CREATE POLICY "관리자 주문 상태 수정"
  ON public.orders
  FOR UPDATE
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- order_items ----------------------------------------------------------------
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 주문 아이템 조회" ON public.order_items;
CREATE POLICY "본인 주문 아이템 조회"
  ON public.order_items
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "본인 주문 아이템 생성" ON public.order_items;
CREATE POLICY "본인 주문 아이템 생성"
  ON public.order_items
  FOR INSERT
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "관리자 전체 아이템 조회" ON public.order_items;
CREATE POLICY "관리자 전체 아이템 조회"
  ON public.order_items
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- fortune_purchases ----------------------------------------------------------
ALTER TABLE public.fortune_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 구매만 조회" ON public.fortune_purchases;
CREATE POLICY "본인 구매만 조회"
  ON public.fortune_purchases
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 구매만 등록" ON public.fortune_purchases;
CREATE POLICY "본인 구매만 등록"
  ON public.fortune_purchases
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "본인 구매만 업데이트" ON public.fortune_purchases;
CREATE POLICY "본인 구매만 업데이트"
  ON public.fortune_purchases
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

-- profiles -------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "본인 프로필 조회" ON public.profiles;
CREATE POLICY "본인 프로필 조회"
  ON public.profiles
  FOR SELECT
  TO public
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "본인 프로필 수정" ON public.profiles;
CREATE POLICY "본인 프로필 수정"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "관리자 전체 조회" ON public.profiles;
CREATE POLICY "관리자 전체 조회"
  ON public.profiles
  FOR SELECT
  TO public
  USING (is_admin());
