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

    // 결제 금액 서버 대조: DB 주문 금액과 요청 금액 비교
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(orderId);
      const col = isUuid ? 'id' : 'order_number';
      const { data: orderRow } = await sb
        .from('orders')
        .select('total, status')
        .eq(col, orderId)
        .single();

      if (orderRow) {
        if (orderRow.status !== 'pending') {
          console.warn(`[confirm-payment] 이미 처리된 주문: ${orderId} (status=${orderRow.status})`);
          return json({ ok: false, error: '이미 처리된 주문입니다.' }, 409);
        }
        if (orderRow.total !== amount) {
          console.error(`[confirm-payment] 금액 불일치: DB=${orderRow.total}, 요청=${amount}`);
          return json({ ok: false, error: '결제 금액이 일치하지 않습니다.' }, 400);
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

    // DB 주문 상태 업데이트: pending → paid
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        // orderId가 UUID면 id로, 아니면 order_number로 매칭
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(orderId);
        const col = isUuid ? 'id' : 'order_number';
        const { data: updatedOrder } = await sb
          .from('orders')
          .update({ status: 'paid', payment_key: paymentKey })
          .eq(col, orderId)
          .select('id')
          .single();
        console.log(`[confirm-payment] DB 상태 업데이트: ${col}=${orderId} → paid`);

        // 이메일 발송 트리거 (비동기, 실패해도 결제 응답에 영향 없음)
        if (updatedOrder?.id) {
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
