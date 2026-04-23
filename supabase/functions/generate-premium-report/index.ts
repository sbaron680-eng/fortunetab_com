import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, corsPreflightResponse, jsonResponse } from '../_shared/cors.ts';

/**
 * generate-premium-report Edge Function
 *
 * 프리미엄 사주 플래너 주문의 심층 리포트 자동 생성 파이프라인 진입점.
 * confirm-payment가 fire-and-forget으로 호출. 실제 생성은 NAS n8n 워크플로가 수행.
 *
 * 저장 정책: NAS pdf_server 로컬 파일시스템 · 32일 보관 후 자동 삭제 (n8n cron).
 * Supabase Storage는 수익화 후 도입 대시.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const N8N_WEBHOOK_URL = Deno.env.get('N8N_REPORT_WEBHOOK_URL') || '';
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SHARED_SECRET') || '';

const REPORT_RETENTION_DAYS = 32;

// CORS: ../_shared/cors.ts (2026-04-23 보안 하드닝 - whitelist 전환)

async function sign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const json = (body: Record<string, unknown>, status = 200) =>
    jsonResponse(body, status, req);
  if (req.method === 'OPTIONS') return corsPreflightResponse(req);
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const { order_id } = await req.json() as { order_id: string };
    if (!order_id) return json({ ok: false, error: 'order_id is required' }, 400);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ ok: false, error: 'Supabase credentials not configured' }, 500);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('id, order_number, user_id, status, saju_data, report_status, report_file_url, access_token')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      console.error('[generate-premium-report] order not found:', order_id, orderErr);
      return json({ ok: false, error: 'Order not found' }, 404);
    }

    // access_token 보장: 구주문에 NULL일 수 있음 → UUID 발급 후 즉시 저장.
    // 이 토큰은 PDF 파일명·URL에 포함되어 capability URL로 동작한다.
    let accessToken: string = order.access_token ?? '';
    if (!accessToken) {
      accessToken = crypto.randomUUID();
      const { error: tokErr } = await sb
        .from('orders')
        .update({ access_token: accessToken })
        .eq('id', order.id);
      if (tokErr) {
        console.error('[generate-premium-report] access_token 생성 실패:', tokErr);
        return json({ ok: false, error: 'access_token 생성 실패' }, 500);
      }
    }

    if (order.status !== 'paid' && order.status !== 'completed') {
      return json({ ok: false, error: `Order status '${order.status}' not eligible` }, 409);
    }

    const { data: items } = await sb
      .from('order_items')
      .select('product_id, product_name')
      .eq('order_id', order.id);

    const isPremium = (items ?? []).some(i => i.product_id === 'saju-planner-premium');
    if (!isPremium) {
      return json({ ok: false, error: '프리미엄 상품이 포함되지 않은 주문입니다.' }, 400);
    }

    if (order.report_status === 'sent') {
      return json({ ok: false, error: '이미 발송 완료된 리포트입니다.' }, 409);
    }

    const { data: authUser } = await sb.auth.admin.getUserById(order.user_id);
    const { data: profile } = await sb.from('profiles').select('name, birth_date, birth_hour, gender').eq('id', order.user_id).single();

    const userEmail = authUser?.user?.email ?? null;
    if (!userEmail) {
      return json({ ok: false, error: 'User email not found' }, 404);
    }

    await sb
      .from('orders')
      .update({ report_status: 'preparing' })
      .eq('id', order.id);

    if (!N8N_WEBHOOK_URL) {
      console.warn('[generate-premium-report] N8N_REPORT_WEBHOOK_URL 미설정 — 조기 반환');
      return json({ ok: true, queued: false, reason: 'n8n webhook not configured' });
    }

    const payload = {
      order_id: order.id,
      order_number: order.order_number,
      user: {
        id: order.user_id,
        email: userEmail,
        name: profile?.name ?? null,
        birth_date: profile?.birth_date ?? null,
        birth_hour: profile?.birth_hour ?? null,
        gender: profile?.gender ?? null,
      },
      saju_data: order.saju_data,
      product_ids: (items ?? []).map(i => i.product_id),
      access_token: accessToken,                     // capability URL에 포함되어 PDF 무단 접근 방지
      storage: {
        target: 'nas',                               // NAS pdf_server 로컬 저장
        retention_days: REPORT_RETENTION_DAYS,       // 32일 후 자동 삭제
        supabase_storage_enabled: false,             // 수익화 후 true 전환
        filename_pattern: '{order_id}_{access_token}.pdf',  // n8n 워크플로와 계약
      },
      callback: {
        send_email_url: `${SUPABASE_URL}/functions/v1/send-report-email`,
      },
      requested_at: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const signature = WEBHOOK_SECRET ? await sign(body, WEBHOOK_SECRET) : '';

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('[generate-premium-report] n8n webhook 실패:', res.status, errText);
        await sb.from('orders').update({ report_status: 'pending' }).eq('id', order.id);
        return json({ ok: false, error: 'n8n 워크플로에서 자동 생성 시작 실패' }, 502);
      }
      console.log('[generate-premium-report] n8n 트리거 성공:', order.order_number);
      return json({ ok: true, queued: true, order_number: order.order_number });
    } catch (e) {
      console.error('[generate-premium-report] n8n 연결 오류:', e);
      await sb.from('orders').update({ report_status: 'pending' }).eq('id', order.id);
      return json({ ok: false, error: 'n8n 워크플로 연결 실패' }, 502);
    }
  } catch (e) {
    console.error('[generate-premium-report] error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});
