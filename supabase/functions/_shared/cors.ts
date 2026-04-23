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

const ALLOWED_ORIGINS = new Set<string>([
  'https://fortunetab.com',
  'https://www.fortunetab.com',
  'http://localhost:3000',     // Next dev
  'http://localhost:8788',     // wrangler pages dev
]);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? '';
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret',
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
