import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsPreflightResponse, jsonResponse } from '../_shared/cors.ts';

/**
 * create-session Edge Function — AI Chat Session 생성 + 선차감
 *
 * 계약:
 *   Request:  POST /functions/v1/create-session  (Bearer = Supabase session)
 *     body: {
 *       mode: 'biz'|'gen',
 *       birth_date: 'YYYY-MM-DD',
 *       gender: 'male'|'female',
 *       fortune_snapshot: { fortune_score, daun_phase, grade_label, ... },
 *       birth_hour?: number, birth_minute?: number, birth_location?: string,
 *       locale?: 'ko'|'en'  (default 'ko')
 *     }
 *   Response: 200 { ok: true, sessionId, maxMessages, balance }
 *   Errors:   401 unauthorized / 400 invalid_request / 402 insufficient_credits / 500 *
 *
 * 트랜잭션 순서 (orphan 방지):
 *   1) fortune_profiles UPSERT (캐시, 실패 시 조기 return)
 *   2) spend_credits RPC (ref_id=null 임시)
 *      → insufficient → 402 반환 (아직 아무것도 안 생성)
 *      → 기타 실패 → 500
 *   3) chat_sessions INSERT (credits_spent=5 확정값)
 *      → 실패 시 add_credits RPC로 환불 → 500
 *   4) credit_transactions UPDATE reference_id=session.id (best-effort 감사 연결)
 *
 * 테스트법:
 *   - 정상: 크레딧 5 보유 유저 → 200 + sessionId
 *   - 잔액 부족: 402 + insufficient_credits
 *   - 검증 실패: 400 invalid_request
 *
 * 예상 오류 3:
 *   1. service role 키 미설정 → 5xx
 *   2. fortune_profiles unique 제약 위반 → UPSERT로 해결
 *   3. Supabase 네트워크 장애 → 500, 세션 롤백이 실패할 수 있음 (orphan 가능)
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const SESSION_COST = 5;
const DEFAULT_MAX_MESSAGES = 30;

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
  if (!b.fortune_snapshot || typeof b.fortune_snapshot !== 'object') return false;
  if (b.birth_hour != null && (typeof b.birth_hour !== 'number' || b.birth_hour < 0 || b.birth_hour > 23)) return false;
  if (b.birth_minute != null && (typeof b.birth_minute !== 'number' || b.birth_minute < 0 || b.birth_minute > 59)) return false;
  if (b.locale && b.locale !== 'ko' && b.locale !== 'en') return false;
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsPreflightResponse(req);
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, req);

  // 1. 인증 — user JWT로 getUser
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

  // 2. 바디 파싱 + 검증
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

  // 3. Service role 클라이언트 (RPC + 테이블 쓰기)
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 4. fortune_profiles UPSERT (세션과 독립적인 캐시 — 실패해도 세션 생성 가능하지만, 일관성 위해 실패 시 중단)
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { error: profileErr } = await sbAdmin
    .from('fortune_profiles')
    .upsert({
      user_id: user.id,
      birth_date: body.birth_date,
      birth_hour: body.birth_hour ?? null,
      birth_minute: body.birth_minute ?? null,
      birth_location: body.birth_location ?? null,
      gender: body.gender,
      composite_score: body.fortune_snapshot,
      calculated_at: nowIso,
      expires_at: expiresIso,
    }, { onConflict: 'user_id' });

  if (profileErr) {
    console.error('[create-session] profile upsert error:', profileErr);
    return jsonResponse({ error: 'profile_upsert_failed' }, 500, req);
  }

  // 5. spend_credits — 선차감 (ref_id는 아직 없음, best-effort로 나중에 연결)
  const { data: spendResult, error: spendErr } = await sbAdmin.rpc('spend_credits', {
    p_user_id: user.id,
    p_amount: SESSION_COST,
    p_reason: 'session_start',
    p_ref_type: 'chat_session',
  });

  const spentOk = !spendErr && spendResult && (spendResult as { ok: boolean }).ok === true;
  if (!spentOk) {
    const res = spendResult as { error?: string; balance?: number; required?: number } | null;
    if (res?.error === 'insufficient_credits') {
      return jsonResponse({
        error: 'insufficient_credits',
        balance: res.balance ?? 0,
        required: res.required ?? SESSION_COST,
      }, 402, req);
    }
    console.error('[create-session] spend_credits failed:', spendErr, res);
    return jsonResponse({ error: 'spend_failed' }, 500, req);
  }

  const balance = (spendResult as { balance?: number }).balance ?? 0;

  // 6. chat_sessions INSERT (credits_spent 확정값)
  const title = body.mode === 'biz' ? '사업 발굴 세션' : '명발굴 세션';
  const { data: session, error: sessionErr } = await sbAdmin
    .from('chat_sessions')
    .insert({
      user_id: user.id,
      session_type: 'conversation',
      status: 'active',
      fortune_snapshot: body.fortune_snapshot,
      credits_spent: SESSION_COST,
      locale: body.locale ?? 'ko',
      max_messages: DEFAULT_MAX_MESSAGES,
      title,
    })
    .select('id')
    .single();

  if (sessionErr || !session) {
    // 세션 생성 실패 — 차감된 크레딧 환불
    console.error('[create-session] session insert failed, refunding:', sessionErr);
    await sbAdmin.rpc('add_credits', {
      p_user_id: user.id,
      p_amount: SESSION_COST,
      p_reason: 'refund',
      p_ref_type: 'chat_session',
    });
    return jsonResponse({ error: 'session_insert_failed' }, 500, req);
  }

  // 7. 감사 연결 (best-effort) — 방금 생성한 session_start 트랜잭션에 reference_id 주입.
  //    실패해도 주 기능은 성공, ledger는 credit_transactions 기준이므로 감사 경미한 손실.
  const { error: auditErr } = await sbAdmin
    .from('credit_transactions')
    .update({ reference_id: session.id })
    .eq('user_id', user.id)
    .eq('reason', 'session_start')
    .eq('reference_type', 'chat_session')
    .is('reference_id', null);
  if (auditErr) {
    console.warn('[create-session] audit linking failed (non-fatal):', auditErr);
  }

  return jsonResponse({
    ok: true,
    sessionId: session.id,
    maxMessages: DEFAULT_MAX_MESSAGES,
    balance,
  }, 200, req);
});
