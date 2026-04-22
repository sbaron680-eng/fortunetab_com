import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * send-order-email Edge Function
 *
 * 결제 완료 후 사용자에게 PDF 다운로드 링크 이메일 발송.
 * Resend API 사용 (https://resend.com).
 *
 * 호출: confirm-payment 성공 후 또는 n8n 워크플로에서 트리거
 *
 * Body: { order_id: string }
 *
 * 환경변수:
 *   RESEND_API_KEY — Resend API 키
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — DB 조회용
 *   SITE_URL — 사이트 도메인 (기본: https://fortunetab.com)
 */

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SITE_URL = Deno.env.get('SITE_URL') || 'https://fortunetab.com';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'FortuneTab <noreply@fortunetab.com>';

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!RESEND_API_KEY) {
    console.error('[send-order-email] RESEND_API_KEY not set');
    return json({ ok: false, error: 'Email service not configured' }, 500);
  }

  try {
    const { order_id } = await req.json() as { order_id: string };
    if (!order_id) return json({ ok: false, error: 'order_id is required' }, 400);

    // DB에서 주문 + 사용자 정보 조회
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('id, order_number, status, total, access_token, file_url, user_id, saju_data')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) {
      return json({ ok: false, error: 'Order not found' }, 404);
    }

    // 사용자 이메일 조회
    const { data: profile } = await sb
      .from('profiles')
      .select('name')
      .eq('id', order.user_id)
      .single();

    const { data: authUser } = await sb.auth.admin.getUserById(order.user_id);
    const userEmail = authUser?.user?.email;
    const userName = profile?.name || '고객';

    if (!userEmail) {
      return json({ ok: false, error: 'User email not found' }, 404);
    }

    // 주문 아이템 조회 → 프리미엄 상품 포함 여부 판단 (리포트 별도 발송 안내용)
    const { data: items } = await sb
      .from('order_items')
      .select('product_id')
      .eq('order_id', order.id);
    const hasPremium = (items ?? []).some((i) => i.product_id === 'saju-planner-premium');

    // 다운로드 링크 생성
    const downloadUrl = order.file_url
      ? `${SITE_URL}/premium-planner/view?order=${order.id}&token=${order.access_token}`
      : `${SITE_URL}/dashboard`;

    // 이메일 발송 (Resend API)
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `[FortuneTab] 맞춤 플래너가 준비되었습니다 (${order.order_number})`,
        html: buildEmailHtml({
          userName,
          orderNumber: order.order_number,
          total: order.total,
          downloadUrl,
          hasFile: !!order.file_url,
          hasPremium,
        }),
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('[send-order-email] Resend error:', errBody);
      return json({ ok: false, error: 'Email delivery failed' }, 500);
    }

    const emailData = await emailRes.json();
    console.log(`[send-order-email] 발송 성공: ${userEmail}, order=${order.order_number}, resend_id=${emailData.id}`);

    // 주문에 이메일 발송 기록
    await sb
      .from('orders')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', order_id);

    return json({ ok: true, email_id: emailData.id });
  } catch (e) {
    console.error('[send-order-email] error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

// ── 이메일 HTML 템플릿 ───────────────────────────────────────────────────────

// 유료 PDF NAS 보관 기간 (일) · 리포트 자동 생성 ETA 문구
const STORAGE_DAYS = 32;
const REPORT_ETA = '평균 5~10분 이내';

function buildEmailHtml(params: {
  userName: string;
  orderNumber: string;
  total: number;
  downloadUrl: string;
  hasFile: boolean;
  hasPremium: boolean;
}): string {
  const { userName, orderNumber, total, downloadUrl, hasFile, hasPremium } = params;
  const formattedTotal = total > 0 ? `&#8361;${total.toLocaleString('ko-KR')}` : '무료';

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <!-- 헤더 -->
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="font-size:24px;color:#1a1a2e;margin:0;">🌙 FortuneTab</h1>
    <p style="font-size:13px;color:#888;margin-top:4px;">막혔을 때, 내 안의 답을 꺼냅니다</p>
  </div>

  <!-- 본문 카드 -->
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e8e6e1;">
    <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 8px;">
      ${userName}님, 맞춤 플래너가 준비되었습니다!
    </h2>
    <p style="font-size:14px;color:#666;margin:0 0 24px;line-height:1.6;">
      사주 분석을 기반으로 제작된 맞춤 플래너를 확인하세요.
    </p>

    <!-- 주문 정보 -->
    <div style="background:#f8f6f1;border-radius:12px;padding:16px;margin-bottom:24px;">
      <table style="width:100%;font-size:13px;color:#555;">
        <tr><td style="padding:4px 0;">주문번호</td><td style="text-align:right;font-weight:600;color:#1a1a2e;">${orderNumber}</td></tr>
        <tr><td style="padding:4px 0;">결제금액</td><td style="text-align:right;font-weight:600;color:#1a1a2e;">${formattedTotal}</td></tr>
      </table>
    </div>

    <!-- CTA 버튼 -->
    <a href="${downloadUrl}" style="display:block;text-align:center;background:#f0c040;color:#1a1a2e;font-weight:700;font-size:15px;padding:14px;border-radius:12px;text-decoration:none;">
      ${hasFile ? '📥 PDF 다운로드' : '📊 대시보드에서 확인하기'}
    </a>

    ${hasFile ? `
    <p style="font-size:11px;color:#999;text-align:center;margin-top:12px;">
      ⏰ PDF 파일은 NAS에서 <b>${STORAGE_DAYS}일간 보관</b>되며, 이후 자동 삭제됩니다. 수신 후 가급적 빠르게 다운로드해 주세요.
    </p>
    ` : `
    <p style="font-size:11px;color:#999;text-align:center;margin-top:12px;">
      대시보드에서 바로 맞춤 플래너 PDF를 생성하고 다운로드할 수 있습니다.
    </p>
    `}

    ${hasPremium ? `
    <!-- 프리미엄 리포트 안내 블록 -->
    <div style="margin-top:24px;padding:16px;background:#fdf6e3;border:1px solid #f0c040;border-radius:12px;">
      <p style="font-size:14px;font-weight:700;color:#1a1a2e;margin:0 0 8px;">
        📖 사주 심층 리포트는 별도로 발송됩니다
      </p>
      <p style="font-size:12.5px;color:#666;line-height:1.6;margin:0;">
        프리미엄 구매 고객님께는 <b>${REPORT_ETA}</b>
        사주 구조·10년 대운·월별 세운 분석이 담긴 심층 리포트 PDF가
        <b>AI로 자동 생성되어</b> 이 이메일 주소로 별도 발송됩니다.<br/>
        <span style="font-size:11px;color:#999;">
          30분이 지나도 리포트가 도착하지 않으면
          <a href="mailto:sbaron680@gmail.com" style="color:#1a1a2e;">고객지원</a>으로 문의해 주세요.
        </span>
      </p>
    </div>
    ` : ''}
  </div>

  <!-- 푸터 -->
  <div style="text-align:center;margin-top:24px;font-size:11px;color:#aaa;">
    <p>FortuneTab · fortunetab.com</p>
    <p>문의: sbaron680@gmail.com</p>
  </div>

</div>
</body>
</html>`;
}
