import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') || '';
const TOSS_PAYPAL_SECRET_KEY = Deno.env.get('TOSS_PAYPAL_SECRET_KEY') || '';

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
    return json({ ok: true, data });
  } catch (e) {
    console.error('[confirm-payment] error:', e);
    const msg = e instanceof Error ? e.message : '결제 승인 처리 중 오류';
    return json({ ok: false, error: msg }, 500);
  }
});
