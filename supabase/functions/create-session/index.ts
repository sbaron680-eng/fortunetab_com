import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsPreflightResponse, jsonResponse } from '../_shared/cors.ts';

/**
 * create-session Edge Function — AI Chat Session 생성 (2026-04-24 정밀 감사 후 재설계)
 *
 * 계약:
 *   Request:  POST /functions/v1/create-session  (Bearer = Supabase session)
 *     body: {
 *       mode: 'biz'|'gen',
 *       birth_date: 'YYYY-MM-DD',
 *       gender: 'male'|'female',
 *       fortune_snapshot: {                    // camelCase whitelist
 *         fortuneScore: number,                // 필수
 *         grade: string,                       // 필수
 *         daunPhase: string,                   // 필수
 *         dayElem?, yongsin?, sunSign?, moonSign?, risingSign?
 *       },
 *       birth_hour?: number, birth_minute?: number, birth_location?: string,
 *       locale?: 'ko'|'en'  (default 'ko')
 *     }
 *   Response: 200 { ok: true, sessionId, maxMessages, balance }
 *   Errors:   401 unauthorized / 400 invalid_request / 402 insufficient_credits / 500 *
 *
 * 아키텍처 (C1 수정 후):
 *   - 단일 RPC `create_chat_session_atomic` 호출 → 내부 트랜잭션이 credit + profile +
 *     session + audit를 한 번에 처리. 부분 실패 자동 롤백.
 *   - service_role 사용 (RPC는 service_role만 EXECUTE 허용됨)
 *   - 서버 책임: Bearer JWT 검증 → user.id 확보 → 화이트리스트 pick → RPC 호출
 *
 * 테스트법:
 *   - 정상: 크레딧 5 보유 유저 → 200 + sessionId
 *   - 잔액 부족: 402 + insufficient_credits + balance/required
 *   - 미인증: 401
 *   - 검증 실패: 400 invalid_request
 *
 * 예상 오류 3:
 *   1. SUPABASE_SERVICE_ROLE_KEY 미설정 → 5xx
 *   2. 00014 마이그레이션 미적용 → RPC not found 5xx
 *   3. fortune_snapshot 필수 키 누락 → 400 invalid_snapshot
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const SESSION_COST = 5;
const DEFAULT_MAX_MESSAGES = 30;

// fortune_snapshot 화이트리스트 — chat Edge Function의 sanitizeFortuneSnapshot과 동기화
const SNAPSHOT_ALLOWED_KEYS = [
  'fortuneScore', 'grade', 'dayElem', 'yongsin',
  'daunPhase', 'sunSign', 'moonSign', 'risingSign',
] as const;
const SNAPSHOT_REQUIRED_KEYS = ['fortuneScore', 'grade', 'daunPhase'] as const;

interface CreateSessionBody {
  mode: 'biz' | 'gen';
  birth_date: string;
  birth_hour?: number | null;
  birth_minute?: number | null;
  gender: 'male' | 'female';
  birth_location?: string | null;
  fortune_snapshot: Record<string, unknown>;
  locale?: 'ko' | 'en';
}

function isValidBody(body: unknown): body is CreateSessionBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Partial<CreateSessionBody>;
  if (b.mode !== 'biz' && b.mode !== 'gen') return false;
  if (typeof b.birth_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.birth_date)) return false;
  if (b.gender !== 'male' && b.gender !== 'female') return false;
  if (b.birth_hour != null && (typeof b.birth_hour !== 'number' || b.birth_hour < 0 || b.birth_hour > 23)) return false;
  if (b.birth_minute != null && (typeof b.birth_minute !== 'number' || b.birth_minute < 0 || b.birth_minute > 59)) return false;
  if (b.locale != null && b.locale !== 'ko' && b.locale !== 'en') return false;

  // fortune_snapshot 구조 검증
  if (!b.fortune_snapshot || typeof b.fortune_snapshot !== 'object') return false;
  const snap = b.fortune_snapshot as Record<string, unknown>;
  for (const key of SNAPSHOT_REQUIRED_KEYS) {
    if (snap[key] === undefined || snap[key] === null) return false;
  }
  if (typeof snap.fortuneScore !== 'number' || !Number.isFinite(snap.fortuneScore)) return false;
  if (typeof snap.grade !== 'string' || snap.grade.length === 0) return false;
  if (typeof snap.daunPhase !== 'string' || snap.daunPhase.length === 0) return false;

  return true;
}

/**
 * 클라이언트 주입 방지: 화이트리스트 키만 남기고 나머지 drop.
 * chat Edge Function의 sanitizeFortuneSnapshot과 동일 스펙.
 */
function pickSnapshot(raw: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of SNAPSHOT_ALLOWED_KEYS) {
    if (raw[key] !== undefined && raw[key] !== null) {
      picked[key] = raw[key];
    }
  }
  return picked;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse(req);
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  // ── 1. 인증 (Bearer JWT → user.id) ────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'unauthorized' }, 401, req);
  }

  const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await sbUser.auth.getUser();
  if (authErr || !user) {
    return jsonResponse({ error: 'unauthorized' }, 401, req);
  }

  // ── 2. 바디 파싱 + 검증 ───────────────────────────────────
  let body: CreateSessionBody;
  try {
    const raw = await req.json();
    if (!isValidBody(raw)) {
      return jsonResponse({ error: 'invalid_request' }, 400, req);
    }
    body = raw;
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400, req);
  }

  // ── 3. 화이트리스트 pick (prompt injection 방어) ───────────
  const safeSnapshot = pickSnapshot(body.fortune_snapshot);

  // ── 4. atomic RPC 호출 ───────────────────────────────────
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const title = body.mode === 'biz' ? '사업 발굴 세션' : '명발굴 세션';

  const { data: rpcResult, error: rpcErr } = await sbAdmin.rpc(
    'create_chat_session_atomic',
    {
      p_user_id: user.id,
      p_mode: body.mode,
      p_title: title,
      p_fortune_snapshot: safeSnapshot,
      p_profile: {
        birth_date: body.birth_date,
        birth_hour: body.birth_hour ?? null,
        birth_minute: body.birth_minute ?? null,
        birth_location: body.birth_location ?? null,
        gender: body.gender,
      },
      p_amount: SESSION_COST,
      p_max_messages: DEFAULT_MAX_MESSAGES,
      p_locale: body.locale ?? 'ko',
    },
  );

  if (rpcErr) {
    console.error('[create-session] RPC error:', rpcErr);
    return jsonResponse({ error: 'rpc_failed' }, 500, req);
  }

  if (!rpcResult || typeof rpcResult !== 'object') {
    console.error('[create-session] unexpected RPC result:', rpcResult);
    return jsonResponse({ error: 'unexpected_result' }, 500, req);
  }

  const result = rpcResult as {
    ok?: boolean;
    error?: string;
    session_id?: string;
    balance?: number;
    required?: number;
    max_messages?: number;
  };

  if (result.ok !== true) {
    if (result.error === 'insufficient_credits') {
      return jsonResponse({
        error: 'insufficient_credits',
        balance: result.balance ?? 0,
        required: result.required ?? SESSION_COST,
      }, 402, req);
    }
    console.error('[create-session] RPC logical error:', result);
    return jsonResponse({ error: result.error ?? 'session_creation_failed' }, 400, req);
  }

  return jsonResponse({
    ok: true,
    sessionId: result.session_id,
    maxMessages: result.max_messages ?? DEFAULT_MAX_MESSAGES,
    balance: result.balance ?? 0,
  }, 200, req);
});
