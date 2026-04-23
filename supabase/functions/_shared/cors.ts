// ============================================================
// 공통 CORS 헬퍼 — 2026-04-23 보안 감사 대응
// ============================================================
// 와일드카드 Origin('*')은 인증된 세션과 결합 시 cross-origin 세션 악용을
// 가능케 함. 명시적 화이트리스트로 전환.
//
// 사용:
//   import { corsHeaders, corsPreflightResponse } from '../_shared/cors.ts';
//   if (req.method === 'OPTIONS') return corsPreflightResponse(req);
//   const headers = corsHeaders(req);

// 프로덕션 화이트리스트 — localhost는 포함하지 않음.
// 이유: Supabase Edge Functions는 단일 배포(dev/prod 분기 없음). localhost를
//       허용하면 공격자가 피해자에게 악성 로컬 서버를 띄우도록 유도 후 프로덕션
//       Edge Function에 cross-origin 호출을 시켜 피해자 토큰으로 사주/주문을
//       읽을 수 있음.
// 로컬 개발: `supabase functions serve`로 로컬 런타임 사용 (프록시 우회).
const ALLOWED_ORIGINS = new Set<string>([
  'https://fortunetab.com',
  'https://www.fortunetab.com',
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    // x-internal-secret는 내부 호출 전용(브라우저 사용 없음) — Allow-Headers에서 제거.
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function corsPreflightResponse(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) });
}

export function jsonResponse(body: Record<string, unknown>, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}
