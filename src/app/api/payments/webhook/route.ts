import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyWebhookSignature, type LsWebhookEvent } from '@/lib/lemonsqueezy';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-signature') ?? '';

    // 서명 검증
    const valid = await verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody) as LsWebhookEvent;
    const eventName = event.meta.event_name;
    const userId = event.meta.custom_data?.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    switch (eventName) {
      // ── 주문 생성 (단건 + 포인트) ─────────────────────────────
      case 'order_created': {
        const plan = event.meta.custom_data?.plan;
        if (plan === 'points') {
          const { data: existing } = await supabase
            .from('credits')
            .select('balance')
            .eq('user_id', userId)
            .eq('service', 'ft')
            .single();

          const newBalance = (existing?.balance ?? 0) + 5;
          const sixMonthsLater = new Date();
          sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

          await supabase
            .from('credits')
            .upsert({
              user_id: userId,
              service: 'ft',
              balance: newBalance,
              expires_at: sixMonthsLater.toISOString(),
            }, {
              onConflict: 'user_id,service',
            });
        }
        // 단건(single)은 ft_sessions.payment_type으로 관리 — 별도 처리 없음
        break;
      }

      // ── 구독 생성 ──────────────────────────────────────────────
      case 'subscription_created': {
        const attrs = event.data.attributes;
        const yearlyVariantId = Number(process.env.LS_VARIANT_FT_SUB_YEARLY);
        const subPlan = attrs.variant_id === yearlyVariantId ? 'yearly' : 'monthly';

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            service: 'ft',
            plan: subPlan,
            status: 'active',
            ls_subscription_id: String(attrs.first_subscription_item?.subscription_id ?? event.data.id),
            ls_customer_id: String(attrs.customer_id),
            current_period_end: attrs.renews_at ?? null,
          }, {
            onConflict: 'user_id,service',
          });
        break;
      }

      // ── 구독 갱신/취소 ────────────────────────────────────────
      case 'subscription_updated': {
        const attrs = event.data.attributes;
        const status = attrs.status === 'active' ? 'active'
          : attrs.status === 'cancelled' ? 'cancelled'
          : attrs.status === 'expired' ? 'expired'
          : attrs.status === 'past_due' ? 'past_due'
          : 'active';

        await supabase
          .from('subscriptions')
          .update({
            status,
            current_period_end: attrs.renews_at ?? attrs.ends_at ?? null,
          })
          .eq('user_id', userId)
          .eq('service', 'ft');
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
