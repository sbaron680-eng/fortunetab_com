-- 00020_global_ai_daily_cap.sql
-- S1-7: Global daily cap on AI chat calls. Defends against runaway Anthropic
-- cost even if per-user rate limits are bypassed (multi-account farming).
-- Counter resets at UTC midnight. Admin callers read real-time usage via RPC.

CREATE TABLE IF NOT EXISTS public.ai_daily_usage (
  date        date PRIMARY KEY,
  call_count  integer NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_daily_usage FROM anon, authenticated;
-- Only service_role + SECURITY DEFINER RPCs touch this table.

CREATE OR REPLACE FUNCTION public.check_and_consume_ai_daily_cap(
  p_daily_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := (now() at time zone 'utc')::date;
  v_count integer;
BEGIN
  INSERT INTO public.ai_daily_usage (date, call_count, updated_at)
  VALUES (v_today, 1, now())
  ON CONFLICT (date) DO UPDATE
    SET call_count = public.ai_daily_usage.call_count + 1,
        updated_at = now()
  RETURNING call_count INTO v_count;

  IF v_count > p_daily_limit THEN
    -- Roll back the increment we just made so the counter reflects rejections
    -- as "attempted but not served".
    UPDATE public.ai_daily_usage
    SET call_count = call_count - 1
    WHERE date = v_today;
    RETURN jsonb_build_object('ok', false, 'count', v_count - 1, 'limit', p_daily_limit);
  END IF;

  RETURN jsonb_build_object('ok', true, 'count', v_count, 'limit', p_daily_limit);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_consume_ai_daily_cap(integer) FROM PUBLIC, anon, authenticated;
-- Only service_role (Edge Function) should call this.
