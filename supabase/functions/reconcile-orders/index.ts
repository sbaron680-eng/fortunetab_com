import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { processPaidOrder } from '../_shared/process-paid-order.ts';

/**
 * Safety-net reconciler for pending orders.
 *
 * Runs on a pg_cron schedule (see migration 00021). For each pending order
 * that has a payment_key (meaning the user at least reached Toss), asks Toss
 * whether the payment is DONE and, if so, commits the transition through
 * the shared processPaidOrder pipeline.
 *
 * Exists to catch the "user closed the tab mid-redirect and the webhook
 * also got lost" edge case. Expected to be a no-op most of the time.
 *
 * Caller must present the service_role key in the Authorization header.
 */

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || '';
const TOSS_PAYPAL_SECRET_KEY = Deno.env.get('TOSS_PAYPAL_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const BATCH_LIMIT = 25;        // don't thrash Toss if there's a backlog
const MIN_AGE_MINUTES = 10;    // don't race with confirm-payment
const MAX_AGE_HOURS = 24;      // no point reconciling week-old abandoned orders

Deno.serve(async (req: Request) => {
  // service_role gate — the function is marked verify_jwt=false so the
  // Supabase gateway doesn't check. We enforce it ourselves.
  const auth = req.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.slice(7) !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const maxAge = new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000).toISOString();
  const minAge = new Date(Date.now() - MIN_AGE_MINUTES * 60 * 1000).toISOString();

  const { data: pending, error: listErr } = await sb
    .from('orders')
    .select('id, order_number, payment_key, total')
    .eq('status', 'pending')
    .not('payment_key', 'is', null)
    .gt('created_at', maxAge)
    .lt('created_at', minAge)
    .order('created_at', { ascending: false })
    .limit(BATCH_LIMIT);

  if (listErr) {
    console.error('[reconcile-orders] list error', listErr);
    return new Response(JSON.stringify({ ok: false, error: 'list_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const results: Array<{ orderNumber: string; outcome: string }> = [];

  for (const ord of pending ?? []) {
    let tossData: Record<string, unknown> | null = null;
    for (const key of [TOSS_SECRET_KEY, TOSS_PAYPAL_SECRET_KEY].filter(Boolean)) {
      try {
        const authHeader = 'Basic ' + btoa(`${key}:`);
        const res = await fetch(
          `https://api.tosspayments.com/v1/payments/${ord.payment_key}`,
          { headers: { Authorization: authHeader } },
        );
        if (res.ok) {
          tossData = await res.json();
          break;
        }
      } catch (e) {
        console.warn('[reconcile-orders] toss lookup failed', ord.order_number, e);
      }
    }

    if (!tossData) {
      results.push({ orderNumber: ord.order_number, outcome: 'toss_unreachable' });
      continue;
    }
    if (tossData.status !== 'DONE') {
      results.push({ orderNumber: ord.order_number, outcome: 'toss_status_' + tossData.status });
      continue;
    }

    const amount = Number(tossData.totalAmount);
    if (!Number.isFinite(amount) || amount !== ord.total) {
      results.push({ orderNumber: ord.order_number, outcome: 'amount_mismatch' });
      continue;
    }

    const r = await processPaidOrder({
      orderId: ord.id,
      amount,
      paymentKey: ord.payment_key,
      sb,
      supabaseUrl: SUPABASE_URL,
      serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
    });
    results.push({
      orderNumber: ord.order_number,
      outcome: r.transitioned ? 'recovered' : r.alreadyPaid ? 'already_paid' : r.reason ?? 'refused',
    });
  }

  return new Response(
    JSON.stringify({ ok: true, scanned: pending?.length ?? 0, results }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
