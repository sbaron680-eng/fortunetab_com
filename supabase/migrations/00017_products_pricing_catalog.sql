-- S1-1 fix: authoritative server-side product pricing.
-- Prevents "client writes order_items.price → confirm-payment recomputes from same tampered
-- value" attack. confirm-payment will now read unit prices from this table, ignoring
-- client-supplied order_items.price entirely.
--
-- Updates to product prices require a new migration (intentional: creates an audit trail).

CREATE TABLE public.products_pricing (
  id         text PRIMARY KEY,
  price_krw  integer NOT NULL CHECK (price_krw >= 0),
  price_usd  numeric(10, 2) CHECK (price_usd IS NULL OR price_usd >= 0),
  active     boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products_pricing IS
  'Authoritative server-side product prices. Read by confirm-payment Edge Function to verify order amounts. DO NOT write from client.';

-- Anon/authenticated have SELECT only (so client can display catalog); no write.
REVOKE ALL ON public.products_pricing FROM anon, authenticated;
GRANT SELECT ON public.products_pricing TO anon, authenticated;

ALTER TABLE public.products_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "누구나 가격 조회 가능"
  ON public.products_pricing FOR SELECT
  USING (true);

-- Seed from src/lib/products.ts (2026-04-24). Prices in KRW.
-- USD null for now — PayPal channel converts at checkout; can populate when USD becomes authoritative.
INSERT INTO public.products_pricing (id, price_krw, price_usd) VALUES
  ('common-planner',       0,     0),
  ('saju-planner-basic',   29000, NULL),
  ('saju-planner-premium', 49000, NULL),
  ('practice-planner',     0,     0),
  ('extras-free',          0,     0),
  ('extras-full',          9900,  NULL);
