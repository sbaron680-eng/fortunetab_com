import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || '';
const TOSS_PAYPAL_SECRET_KEY = Deno.env.get('TOSS_PAYPAL_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const { paymentKey, orderId, amount, paymentType } = await req.json() as {
      paymentKey: string;
      orderId: string;
      amount: number;
      paymentType?: string;
    };

    if (!paymentKey || !orderId || !amount) {
      return json({ ok: false, error: 'paymentKey, orderId, amount는 필수입니다.' }, 400);
    }

    // 결제 금액 서버 대조: DB orders.total ↔ 요청 amount ↔ order_items 서버 재계산
    // (클라이언트가 createOrder로 전달한 total이 조작됐을 수 있으므로 items+promotions로 재계산)
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(orderId);
      const col = isUuid ? 'id' : 'order_number';
      const { data: orderRow } = await sb
        .from('orders')
        .select('id, total, status')
        .eq(col, orderId)
        .single();

      if (orderRow) {
        if (orderRow.status !== 'pending') {
          console.warn(`[confirm-payment] 이미 처리된 주문: ${orderId} (status=${orderRow.status})`);
          return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409);
        }
        if (orderRow.total !== amount) {
          console.error(`[confirm-payment] DB↔요청 금액 불일치: DB=${orderRow.total}, 요청=${amount}`);
          return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400);
        }

        // ★ 서버측 재계산: order_items × 활성 프로모션
        const { data: items } = await sb
          .from('order_items')
          .select('product_id, price, qty')
          .eq('order_id', orderRow.id);

        if (!items || items.length === 0) {
          console.error(`[confirm-payment] 주문 아이템 없음: ${orderRow.id}`);
          return json({ ok: false, error: '주문 아이템을 찾을 수 없습니다.' }, 400);
        }

        const nowIso = new Date().toISOString();
        const { data: promos } = await sb
          .from('promotions')
          .select('product_slug, discount_type, discount_value')
          .eq('is_active', true)
          .lte('starts_at', nowIso)
          .or(`ends_at.is.null,ends_at.gte.${nowIso}`);

        let expected = 0;
        for (const it of items as Array<{ product_id: string; price: number; qty: number }>) {
          const gross = (it.price ?? 0) * (it.qty ?? 1);
          const promo = (promos ?? []).find((p) => p.product_slug === it.product_id)
                     ?? (promos ?? []).find((p) => p.product_slug === null);
          if (promo) {
            const discounted = promo.discount_type === 'percent'
              ? Math.round(gross * (1 - promo.discount_value / 100))
              : Math.max(0, gross - promo.discount_value);
            expected += discounted;
          } else {
            expected += gross;
          }
        }

        // ±1원 오차 허용 (반올림)
        if (Math.abs(expected - amount) > 1) {
          console.error(
            `[confirm-payment] 금액 조작 의심: 재계산=${expected}, 요청=${amount}, DB=${orderRow.total}, items=${JSON.stringify(items)}`
          );
          return json({ ok: false, error: '결제 금액 검증 실패. 장바구니를 새로고침 후 다시 시도해 주세요.' }, 400);
        }
      }
    }

    // PayPal은 별도 MID의 시크릿키 사용
    const secretKey = paymentType === 'PAYPAL' ? TOSS_PAYPAL_SECRET_KEY : TOSS_SECRET_KEY;
    if (!secretKey) {
      const keyName = paymentType === 'PAYPAL' ? 'TOSS_PAYPAL_SECRET_KEY' : 'TOSS_SECRET_KEY';
      console.error(`[confirm-payment] ${keyName} not set`);
      return json({ ok: false, error: '결제 서비스 설정 오류' }, 500);
    }

    // Base64 인코딩 (Deno: btoa 사용)
    const encoded = btoa(`${secretKey}:`);

    // 토스페이먼츠 결제 승인 API 호출
    const tossRes = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encoded}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });

    const data = await tossRes.json();

    if (!tossRes.ok) {
      console.error('[confirm-payment] 승인 실패:', JSON.stringify(data));
      return json({
        ok: false,
        error: data.message || '결제 승인에 실패했습니다.',
        code: data.code,
      }, tossRes.status);
    }

    console.log(`[confirm-payment] 승인 성공: ${orderId} (${paymentType === 'PAYPAL' ? `$${amount}` : `${amount}원`})`);

    // DB 주문 상태 업데이트: pending → paid + 비동기 파이프라인 트리거
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(orderId);
        const col = isUuid ? 'id' : 'order_number';
        const { data: updatedOrder } = await sb
          .from('orders')
          .update({ status: 'paid', payment_key: paymentKey })
          .eq(col, orderId)
          .select('id')
          .single();
        console.log(`[confirm-payment] DB 상태 업데이트: ${col}=${orderId} → paid`);

        if (updatedOrder?.id) {
          // 프리미엄 상품 여부 판별 — generate-premium-report 트리거 조건
          const { data: items } = await sb
            .from('order_items')
            .select('product_id')
            .eq('order_id', updatedOrder.id);
          const hasPremium = (items ?? []).some((i) => i.product_id === 'saju-planner-premium');

          // ── fire-and-forget 1: 맞춤 플래너 안내 이메일 ──────────────────
          fetch(`${SUPABASE_URL}/functions/v1/send-order-email`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ order_id: updatedOrder.id }),
          }).catch(emailErr => {
            console.error('[confirm-payment] 이메일 트리거 실패:', emailErr);
          });

          // ── fire-and-forget 2: 프리미엄이면 심층 리포트 자동 생성 파이프라인 ──
          // 브라우저 종료·세션 이탈과 무관하게 서버가 완성까지 처리.
          // n8n 워크플로가 Claude API × PDF 렌더 × Storage 업로드 × send-report-email 순차 실행.
          if (hasPremium) {
            fetch(`${SUPABASE_URL}/functions/v1/generate-premium-report`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ order_id: updatedOrder.id }),
            }).catch(reportErr => {
              console.error('[confirm-payment] 리포트 생성 트리거 실패:', reportErr);
            });
            console.log(`[confirm-payment] 프리미엄 리포트 자동 생성 트리거: ${updatedOrder.id}`);
          }
        }
      } catch (dbErr) {
        console.error('[confirm-payment] DB 업데이트 실패 (결제는 성공):', dbErr);
      }
    }

    return json({ ok: true, data });
  } catch (e) {
    console.error('[confirm-payment] error:', e);
    const msg = e instanceof Error ? e.message : '결제 승인 처리 중 오류';
    return json({ ok: false, error: msg }, 500);
  }
});
