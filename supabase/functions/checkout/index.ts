import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';

const LS_API_KEY = Deno.env.get('LS_API_KEY') || '';
const LS_STORE_ID = Deno.env.get('LS_STORE_ID') || '';

const VARIANT_MAP: Record<string, string> = {
  single: Deno.env.get('LS_VARIANT_FT_SINGLE') || '',
  points: Deno.env.get('LS_VARIANT_FT_POINTS') || '',
  monthly: Deno.env.get('LS_VARIANT_FT_SUB_MONTHLY') || '',
  yearly: Deno.env.get('LS_VARIANT_FT_SUB_YEARLY') || '',
};

const REDIRECT_URL = 'https://fortunetab.com/session/result';

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

  // 인증 확인
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: '로그인이 필요합니다.' }, 401);
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return json({ error: '로그인 세션이 만료되었습니다.' }, 401);
    }

    if (!user.email) {
      return json({ error: '이메일 정보가 필요합니다.' }, 400);
    }

    // 요청 바디 파싱
    const { plan } = await req.json() as { plan: string };
    if (!['single', 'points', 'monthly', 'yearly'].includes(plan)) {
      return json({ error: '유효하지 않은 플랜입니다.' }, 400);
    }

    // LS 설정 확인
    if (!LS_API_KEY || !LS_STORE_ID) {
      return json({ error: '결제 서비스 설정 오류' }, 500);
    }

    const variantId = VARIANT_MAP[plan];
    if (!variantId) {
      return json({ error: `${plan} 플랜의 variant가 설정되지 않았습니다.` }, 500);
    }

    // Lemon Squeezy Checkout 생성
    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LS_API_KEY}`,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: user.email,
              custom: {
                user_id: user.id,
                plan,
              },
            },
            product_options: {
              redirect_url: REDIRECT_URL,
            },
          },
          relationships: {
            store: {
              data: { type: 'stores', id: LS_STORE_ID },
            },
            variant: {
              data: { type: 'variants', id: variantId },
            },
          },
        },
      }),
    });

    if (!lsRes.ok) {
      const errBody = await lsRes.text();
      console.error('[checkout] Lemon Squeezy error:', lsRes.status, errBody);
      return json({ error: '결제 페이지 생성 실패' }, 500);
    }

    const lsData = await lsRes.json();
    const url = lsData?.data?.attributes?.url;

    if (!url) {
      return json({ error: '결제 URL을 받지 못했습니다.' }, 500);
    }

    return json({ ok: true, url });
  } catch (e) {
    console.error('[checkout] error:', e);
    const msg = e instanceof Error ? e.message : '결제 처리 중 오류가 발생했습니다.';
    return json({ error: msg }, 500);
  }
});
