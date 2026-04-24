// Shared logic for transitioning an order to `paid` after a successful Toss
// confirmation — used by both confirm-payment (client-initiated) and
// toss-webhook (Toss-initiated) so the security-critical path (server
// catalog re-pricing + CAS + TOCTOU + fire-and-forget triggers) lives in
// exactly one place.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface ProcessPaidOrderInput {
  /** Order UUID or order_number (FT-YYYYMMDD-XXXX). Caller must have already
   *  verified this matches the actual Toss payment — don't trust it blind. */
  orderId: string;
  /** Amount Toss confirmed. Used for TOCTOU check against DB total. */
  amount: number;
  /** Toss paymentKey (persisted on the order row for reconciliation). */
  paymentKey: string;
  /** Supabase admin client (service_role). */
  sb: SupabaseClient;
  /** Supabase URL for triggering downstream Edge Functions. */
  supabaseUrl: string;
  /** Service role key for the downstream Authorization header. */
  serviceRoleKey: string;
}

export interface ProcessPaidOrderResult {
  /** true = this call transitioned pending → paid (first writer wins) */
  transitioned: boolean;
  /** true = already in paid state (idempotent success) */
  alreadyPaid: boolean;
  /** Resolved orders.id if found */
  orderUuid: string | null;
  /** Detailed reason if the call refused the update */
  reason?: string;
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Recompute the server-authoritative total for an order from the pricing
 *  catalog and active promotions. Throws if items are missing or reference
 *  an unknown product_id. */
async function recomputeExpectedTotal(
  sb: SupabaseClient,
  orderUuid: string,
): Promise<number> {
  const { data: items } = await sb
    .from('order_items')
    .select('product_id, qty')
    .eq('order_id', orderUuid);

  if (!items || items.length === 0) {
    throw new Error('order_items_missing');
  }

  const productIds = items.map((i) => i.product_id);
  const { data: pricing } = await sb
    .from('products_pricing')
    .select('id, price_krw, active')
    .in('id', productIds);

  const priceMap = new Map<string, { price_krw: number; active: boolean }>(
    (pricing ?? []).map((p) => [p.id, { price_krw: p.price_krw, active: p.active }]),
  );

  const unknown = productIds.filter((id) => !priceMap.has(id));
  if (unknown.length > 0) {
    throw new Error('unknown_products:' + unknown.join(','));
  }

  const nowIso = new Date().toISOString();
  const { data: promos } = await sb
    .from('promotions')
    .select('product_slug, discount_type, discount_value')
    .eq('is_active', true)
    .lte('starts_at', nowIso)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

  let expected = 0;
  for (const it of items as Array<{ product_id: string; qty: number }>) {
    const catalog = priceMap.get(it.product_id)!;
    if (!catalog.active) throw new Error('inactive_product:' + it.product_id);
    const unit = catalog.price_krw;
    const qty = it.qty ?? 1;
    const promo =
      (promos ?? []).find((p) => p.product_slug === it.product_id) ??
      (promos ?? []).find((p) => p.product_slug === null);
    let discountedUnit = unit;
    if (promo) {
      discountedUnit =
        promo.discount_type === 'percent'
          ? Math.round(unit * (1 - promo.discount_value / 100))
          : Math.max(0, unit - promo.discount_value);
    }
    expected += discountedUnit * qty;
  }
  return expected;
}

/**
 * Commit a Toss-confirmed payment to the orders table with full defense:
 *  1) Load order (by UUID or order_number), short-circuit if already paid.
 *  2) Re-price server-side against products_pricing + promotions.
 *  3) CAS UPDATE `status='pending' AND total=amount` → `status='paid'`.
 *  4) Fire-and-forget downstream triggers (email, premium report).
 *
 * Safe to call from both confirm-payment (client redirect) and
 * toss-webhook (Toss-initiated). Idempotent — repeated calls after the
 * first successful transition return `alreadyPaid: true`.
 */
export async function processPaidOrder(
  input: ProcessPaidOrderInput,
): Promise<ProcessPaidOrderResult> {
  const { orderId, amount, paymentKey, sb, supabaseUrl, serviceRoleKey } = input;

  const isUuid = UUID_V4.test(orderId);
  const col = isUuid ? 'id' : 'order_number';

  const { data: orderRow } = await sb
    .from('orders')
    .select('id, total, status')
    .eq(col, orderId)
    .single();

  if (!orderRow) {
    return { transitioned: false, alreadyPaid: false, orderUuid: null, reason: 'order_not_found' };
  }

  if (orderRow.status === 'paid' || orderRow.status === 'completed') {
    return { transitioned: false, alreadyPaid: true, orderUuid: orderRow.id };
  }

  if (orderRow.status !== 'pending') {
    return {
      transitioned: false,
      alreadyPaid: false,
      orderUuid: orderRow.id,
      reason: 'bad_status:' + orderRow.status,
    };
  }

  if (orderRow.total !== amount) {
    return {
      transitioned: false,
      alreadyPaid: false,
      orderUuid: orderRow.id,
      reason: 'total_mismatch',
    };
  }

  // Server-authoritative re-price (defense against tampered order_items.price)
  let expected: number;
  try {
    expected = await recomputeExpectedTotal(sb, orderRow.id);
  } catch (e) {
    return {
      transitioned: false,
      alreadyPaid: false,
      orderUuid: orderRow.id,
      reason: e instanceof Error ? e.message : 'reprice_failed',
    };
  }
  if (Math.abs(expected - amount) > 1) {
    return {
      transitioned: false,
      alreadyPaid: false,
      orderUuid: orderRow.id,
      reason: 'expected_mismatch',
    };
  }

  // CAS + TOCTOU
  const { data: updatedOrder, error: updErr } = await sb
    .from('orders')
    .update({ status: 'paid', payment_key: paymentKey })
    .eq('id', orderRow.id)
    .eq('status', 'pending')
    .eq('total', amount)
    .select('id')
    .maybeSingle();

  if (updErr) {
    return {
      transitioned: false,
      alreadyPaid: false,
      orderUuid: orderRow.id,
      reason: 'update_error:' + (updErr.message ?? '-'),
    };
  }
  if (!updatedOrder) {
    // Someone else flipped it between read and write — treat as idempotent win
    return { transitioned: false, alreadyPaid: true, orderUuid: orderRow.id };
  }

  // Downstream fire-and-forget (same as confirm-payment)
  const { data: items } = await sb
    .from('order_items')
    .select('product_id')
    .eq('order_id', updatedOrder.id);
  const hasPremium = (items ?? []).some((i) => i.product_id === 'saju-planner-premium');

  fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ order_id: updatedOrder.id }),
  }).catch((err) => console.error('[process-paid-order] email trigger failed:', err));

  if (hasPremium) {
    fetch(`${supabaseUrl}/functions/v1/generate-premium-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ order_id: updatedOrder.id }),
    }).catch((err) => console.error('[process-paid-order] report trigger failed:', err));
  }

  return { transitioned: true, alreadyPaid: false, orderUuid: updatedOrder.id };
}
