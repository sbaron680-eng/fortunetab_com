import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { processPaidOrder } from '../_shared/process-paid-order.ts';

/**
 * Toss Payments webhook endpoint.
 *
 * Flow:
 *   1. Toss POSTs { eventType, createdAt, data: { paymentKey, orderId, status, totalAmount } }
 *   2. We re-query Toss Payments API by paymentKey to confirm the event is real
 *      (webhook body is untrusted — no HMAC in Toss's spec).
 *   3. If Toss says DONE, call the shared processPaidOrder which does full
 *      defense-in-depth (server catalog re-price + CAS + TOCTOU + triggers).
 *
 * Register URL in Toss dashboard:
 *   https://<project-ref>.supabase.co/functions/v1/toss-webhook
 *   (config.toml must set verify_jwt=false for this function)
 *
 * Idempotency: processPaidOrder is safe to call repeatedly. Toss retries
 * webhooks on non-2xx, so we always return 200 unless we want a retry.
 */

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || '';
const TOSS_PAYPAL_SECRET_KEY = Deno.env.get('TOSS_PAYPAL_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface TossWebhookBody {
  eventType?: string;
  createdAt?: string;
  data?: {
    paymentKey?: string;
    orderId?: string;
    status?: string;
    totalAmount?: number;
    method?: string;
  };
}

function log(msg: string, ...rest: unknown[]) {
  console.log('[toss-webhook]', msg, ...rest);
}
function warn(msg: string, ...rest: unknown[]) {
  console.warn('[toss-webhook]', msg, ...rest);
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: TossWebhookBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { eventType, data } = body;
  const paymentKey = data?.paymentKey;
  const tossOrderId = data?.orderId;
  const status = data?.status;

  // Toss fires many event types. Only PAYMENT_STATUS_CHANGED+DONE moves money
  // out of the buyer's account. Other events are acknowledged but skipped.
  if (!eventType || !paymentKey || !tossOrderId) {
    log('skip: missing fields', { eventType, hasPK: !!paymentKey, hasOID: !!tossOrderId });
    return new Response(JSON.stringify({ ok: true, skipped: 'missing_fields' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (eventType !== 'PAYMENT_STATUS_CHANGED' || status !== 'DONE') {
    log('skip: not a DONE transition', { eventType, status });
    return new Response(JSON.stringify({ ok: true, skipped: eventType + ':' + status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Re-query Toss by paymentKey to validate — the webhook body is not signed,
  // so the only way to know the event is real is to ask Toss ourselves.
  // KRW and PayPal share the same /v1/payments/{paymentKey} endpoint but
  // require different secret keys. Try KRW first, fall back to PayPal MID.
  let tossData: Record<string, unknown> | null = null;
  for (const key of [TOSS_SECRET_KEY, TOSS_PAYPAL_SECRET_KEY].filter(Boolean)) {
    try {
      const auth = 'Basic ' + btoa(`${key}:`);
      const res = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}`, {
        headers: { Authorization: auth },
      });
      if (res.ok) {
        tossData = await res.json();
        break;
      }
    } catch (e) {
      warn('toss lookup error', e);
    }
  }

  if (!tossData) {
    // Couldn't verify — return 401 so Toss retries (maybe secret was rotating)
    warn('toss verify failed', { paymentKey, tossOrderId });
    return new Response(JSON.stringify({ ok: false, error: 'toss_verify_failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (tossData.status !== 'DONE' || tossData.orderId !== tossOrderId) {
    warn('toss status/orderId mismatch', {
      expectedOID: tossOrderId,
      actualOID: tossData.orderId,
      actualStatus: tossData.status,
    });
    return new Response(JSON.stringify({ ok: false, error: 'mismatch' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const verifiedAmount = Number(tossData.totalAmount);
  if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
    warn('invalid amount from toss', { amount: tossData.totalAmount });
    return new Response(JSON.stringify({ ok: false, error: 'invalid_amount' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const result = await processPaidOrder({
    orderId: tossOrderId,
    amount: verifiedAmount,
    paymentKey,
    sb,
    supabaseUrl: SUPABASE_URL,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  });

  if (result.transitioned) {
    log('transitioned to paid', { orderUuid: result.orderUuid });
  } else if (result.alreadyPaid) {
    log('already paid (idempotent)', { orderUuid: result.orderUuid });
  } else {
    warn('refused', { reason: result.reason, orderUuid: result.orderUuid });
  }

  // Always return 200 — non-2xx triggers Toss retry, and since the webhook
  // surfaces a real payment we don't want infinite retries on business
  // refusals (unknown product, price mismatch, etc.).
  return new Response(JSON.stringify({ ok: true, ...result }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
