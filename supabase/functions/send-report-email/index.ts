import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * send-report-email Edge Function
 *
 * 프리미엄 구매자에게 사주 심층 리포트 PDF를 별도 이메일로 발송.
 * 발송 조건: orders.report_file_url 설정됨 + report_status='preparing' (또는 'pending')
 *
 * 호출 패턴:
 *   1. 관리자가 PDF 생성 후 Supabase Storage에 업로드
 *   2. orders.report_file_url 업데이트 (대시보드 직접 또는 n8n)
 *   3. 이 함수를 호출 → 이메일 발송 → report_status='sent' + report_sent_at 기록
 *
 * Body: { order_id: string }
 *
 * 환경변수:
 *   RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL, FROM_EMAIL
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
    return json({ ok: false, error: 'Email service not configured' }, 500);
  }

  try {
    const { order_id } = await req.json() as { order_id: string };
    if (!order_id) return json({ ok: false, error: 'order_id is required' }, 400);

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 주문 + 리포트 파일 검증
    const { data: order, error: orderErr } = await sb
      .from('orders')
      .select('id, order_number, user_id, saju_data, report_file_url, report_status, report_sent_at')
      .eq('id', order_id)
      .single();

    if (orderErr || !order) return json({ ok: false, error: 'Order not found' }, 404);
    if (!order.report_file_url) {
      return json({ ok: false, error: 'report_file_url이 설정되지 않았습니다. PDF를 업로드하고 URL을 저장해 주세요.' }, 400);
    }
    if (order.report_status === 'sent') {
      return json({ ok: false, error: '이미 발송 완료된 주문입니다.' }, 409);
    }

    // 사용자 이메일 조회
    const { data: profile } = await sb.from('profiles').select('name').eq('id', order.user_id).single();
    const { data: authUser } = await sb.auth.admin.getUserById(order.user_id);
    const userEmail = authUser?.user?.email;
    const userName = profile?.name || '고객';
    if (!userEmail) return json({ ok: false, error: 'User email not found' }, 404);

    // Resend API
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [userEmail],
        subject: `[FortuneTab] 사주 심층 리포트가 도착했습니다 (${order.order_number})`,
        html: buildReportEmailHtml({
          userName,
          orderNumber: order.order_number,
          reportUrl: order.report_file_url,
        }),
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error('[send-report-email] Resend error:', errBody);
      return json({ ok: false, error: 'Email delivery failed' }, 500);
    }

    const emailData = await emailRes.json();
    console.log(`[send-report-email] 발송 성공: ${userEmail}, order=${order.order_number}, resend_id=${emailData.id}`);

    // 발송 성공 → 상태 전환
    await sb
      .from('orders')
      .update({
        report_status: 'sent',
        report_sent_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    return json({ ok: true, email_id: emailData.id });
  } catch (e) {
    console.error('[send-report-email] error:', e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Internal error' }, 500);
  }
});

// ── 이메일 HTML 템플릿 ───────────────────────────────────────────────────────

function buildReportEmailHtml(params: {
  userName: string;
  orderNumber: string;
  reportUrl: string;
}): string {
  const { userName, orderNumber, reportUrl } = params;

  return `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f6f1;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:40px 20px;">

  <!-- 헤더 -->
  <div style="text-align:center;margin-bottom:32px;">
    <h1 style="font-size:24px;color:#1a1a2e;margin:0;">🌙 FortuneTab</h1>
    <p style="font-size:13px;color:#888;margin-top:4px;">동양의 지혜 · 서양의 별을 만나다</p>
  </div>

  <!-- 본문 카드 -->
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e8e6e1;">
    <div style="text-align:center;margin-bottom:16px;">
      <span style="display:inline-block;padding:4px 12px;background:#fdf6e3;color:#b8860b;font-size:12px;font-weight:700;border-radius:12px;border:1px solid #f0c040;">
        📖 사주 심층 리포트 도착
      </span>
    </div>

    <h2 style="font-size:18px;color:#1a1a2e;margin:0 0 8px;text-align:center;">
      ${userName}님의 사주 리포트가 준비되었습니다
    </h2>
    <p style="font-size:13.5px;color:#666;margin:0 0 24px;line-height:1.7;text-align:center;">
      결제해 주신 프리미엄 플래너의 심층 분석 리포트를 별도 PDF로 보내드립니다.<br/>
      사주 구조·10년 대운 흐름·올해 월별 세운 분석을 담았습니다.
    </p>

    <!-- 주문 정보 -->
    <div style="background:#f8f6f1;border-radius:12px;padding:14px;margin-bottom:24px;text-align:center;">
      <span style="font-size:12px;color:#888;">주문번호</span>
      <span style="font-size:13px;font-weight:600;color:#1a1a2e;margin-left:8px;">${orderNumber}</span>
    </div>

    <!-- CTA 버튼 -->
    <a href="${reportUrl}" style="display:block;text-align:center;background:#1a1a2e;color:#f0c040;font-weight:700;font-size:15px;padding:14px;border-radius:12px;text-decoration:none;">
      📥 리포트 PDF 다운로드
    </a>

    <p style="font-size:11px;color:#999;text-align:center;margin-top:12px;">
      ⏰ 리포트 파일은 발송일로부터 32일간 보관된 후 자동 삭제됩니다. 수신 후 가급적 빠르게 다운로드해 주세요.
    </p>

    <!-- 안내 -->
    <div style="margin-top:24px;padding:14px;background:#f5f3ed;border-radius:10px;font-size:12px;color:#666;line-height:1.6;">
      <b style="color:#1a1a2e;">📌 활용 팁</b><br/>
      이 리포트는 이미 발송해드린 맞춤 플래너와 함께 보시는 것을 권해드립니다.
      리포트의 월별 세운 분석을 플래너 월간 페이지 사이드바의 "월간 기운"과 대조하면 흐름이 더 선명히 보입니다.
    </div>

    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:16px;">
      ⚠️ 본 분석은 참고 용도이며 전문 상담을 대체하지 않습니다.
    </p>
  </div>

  <!-- 푸터 -->
  <div style="text-align:center;margin-top:24px;font-size:11px;color:#aaa;">
    <p>FortuneTab · <a href="${SITE_URL}" style="color:#888;">fortunetab.com</a></p>
    <p>문의: <a href="mailto:sbaron680@gmail.com" style="color:#888;">sbaron680@gmail.com</a></p>
  </div>

</div>
</body>
</html>`;
}
