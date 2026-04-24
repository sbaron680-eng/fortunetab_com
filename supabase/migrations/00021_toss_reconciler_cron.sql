-- 00021_toss_reconciler_cron.sql
-- S1-6: safety-net reconciliation for abandoned Toss payments.
-- When the buyer closes the tab mid-redirect AND the Toss webhook drops,
-- confirm-payment never fires and the order stays `pending` while Toss has
-- already debited the card. Every 10 minutes, call the reconcile-orders
-- Edge Function to scan recent pending orders with a payment_key set and
-- ask Toss whether they actually completed.

-- Required extensions -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Partial index for the reconciler's hot query -----------------------------
-- Matches exactly the WHERE in reconcile-orders:
--   status='pending' AND payment_key IS NOT NULL
--   AND created_at BETWEEN now()-24h AND now()-10min
CREATE INDEX IF NOT EXISTS idx_orders_pending_with_payment_key
  ON public.orders (created_at DESC)
  WHERE status = 'pending' AND payment_key IS NOT NULL;

-- Cron entry ----------------------------------------------------------------
-- pg_cron invokes via pg_net.http_post. The Edge Function validates the
-- Authorization header against SUPABASE_SERVICE_ROLE_KEY before trusting
-- the request.
--
-- Project-specific values (URL, service-role key) live in a Postgres GUC
-- set via ALTER DATABASE so the cron body doesn't need them baked in.
-- We stage them in vault-style custom settings read at cron-fire time.

-- Defensive: remove any previous schedule so re-running this migration
-- doesn't accumulate duplicate jobs.
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile-pending-orders');
EXCEPTION WHEN OTHERS THEN
  -- job didn't exist; fine
  NULL;
END $$;

SELECT cron.schedule(
  'reconcile-pending-orders',
  '*/10 * * * *',
  $job$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/reconcile-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);

-- Operator note:
--   After applying this migration, run once (manually, via SQL editor):
--     ALTER DATABASE postgres SET app.supabase_url = 'https://cwnzezlgtcqkmnyojhbd.supabase.co';
--     ALTER DATABASE postgres SET app.service_role_key = '<service_role_key>';
--   The GUCs persist for all future sessions, so the cron body stays clean
--   and the service-role key never lives in migration history.
