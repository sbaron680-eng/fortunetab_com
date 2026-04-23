import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * chat Edge Function — AI Chat Session 스트리밍
 *
 * 계약 (ChatWindow.tsx 기준):
 *   Request:  POST /functions/v1/chat  { sessionId, message }  (Bearer = Supabase session)
 *   Response: SSE 스트림  data: {"text"?, "maxMessages"?, "error"?}
 *   Errors:   HTTP 401(인증) / 403(권한) / 404(세션) / 400(검증) / 402+{error:"insufficient_credits"}(한도)
 *
 * 원자성: increment_message_count RPC가 SELECT FOR UPDATE로 동시성 보장.
 * 2026-04-23: output:'export' 제약으로 Route Handler 불가 → Supabase Edge Function으로 이전.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;
const HISTORY_LIMIT = 30; // 최근 N 메시지까지 문맥으로 전달

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

function sseEvent(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

interface ChatRequest {
  sessionId: string;
  message: string;
}

// ─── 시스템 프롬프트 ──────────────────────────────────────────────────

function buildSystemPrompt(fortuneSnapshot: Record<string, unknown> | null, locale: string): string {
  const lang = locale === 'ko' ? '한국어 존댓말로' : 'in English';
  const snap = fortuneSnapshot
    ? JSON.stringify(fortuneSnapshot).slice(0, 1500)
    : '(운세 스냅샷 없음)';

  return `당신은 FortuneTab의 AI 대화 파트너입니다. 동양 사주명리와 서양 점성술을 융합해 사용자의 삶의 방향을 탐색하도록 돕습니다.

응답 원칙:
- ${lang} 응답
- 판단하지 않는 공감적인 톤 유지, 단정 대신 질문·관찰·가능성 제시
- AI 분석은 참고 용도임을 적절히 상기 (1회 대화에 1회 이내)
- 한 응답은 3~6문장으로 밀도 있게
- Fortune Score, 대운, 십신 등 전문 용어는 사용 가능하나 쉬운 설명을 덧붙임
- 사용자가 구체적 행동을 요청하면 GROW 4법(Ground/Root/Open/Water) 프레임 참고 가능

사용자 운세 스냅샷:
${snap}

대화를 시작합니다. 사용자의 첫 메시지에 자연스럽게 반응하세요.`;
}

// ─── Claude 스트리밍 호출 ────────────────────────────────────────────

async function streamClaude(
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: history,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '');
    console.error('[chat] Claude API error:', res.status, errText.slice(0, 400));
    throw new Error(`AI 오류 (${res.status})`);
  }
  return res.body;
}

// ─── 핸들러 ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // 1. 인증
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: '로그인이 필요합니다.' }, 401);
  }

  let userId: string;
  try {
    const sbUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await sbUser.auth.getUser();
    if (authErr || !user) return json({ error: '세션이 만료되었습니다.' }, 401);
    userId = user.id;
  } catch {
    return json({ error: '인증 확인 실패' }, 401);
  }

  if (!ANTHROPIC_API_KEY) return json({ error: 'AI 서비스 설정 오류' }, 500);

  // 2. 입력 검증
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  if (!body.sessionId || !body.message || typeof body.message !== 'string') {
    return json({ error: 'sessionId와 message가 필요합니다.' }, 400);
  }
  const message = body.message.trim().slice(0, 4000); // 입력 크기 제한
  if (!message) return json({ error: '메시지가 비어있습니다.' }, 400);

  // 3. 서비스 롤 클라이언트 (RPC + 삽입용 — user_id 명시로 권한 제어)
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 4. 원자적 한도 체크 + 카운트 증가 (user+assistant = 2)
  const { data: incResult, error: incErr } = await sbAdmin.rpc('increment_message_count', {
    p_session_id: body.sessionId,
    p_user_id: userId,
    p_increment: 2,
  });
  if (incErr) {
    console.error('[chat] increment_message_count 오류:', incErr);
    return json({ error: 'DB 오류' }, 500);
  }
  if (!incResult?.ok) {
    const reason = incResult?.error;
    if (reason === 'needs_extension') return json({ error: 'insufficient_credits' }, 402);
    if (reason === 'session_not_found') return json({ error: 'session_not_found' }, 404);
    if (reason === 'session_not_active') return json({ error: 'session_not_active' }, 400);
    return json({ error: reason ?? 'quota_check_failed' }, 400);
  }
  const maxMessages: number = incResult.max_messages;

  // 5. 세션 컨텍스트 로드 (fortune_snapshot, locale)
  const { data: session, error: sessErr } = await sbAdmin
    .from('chat_sessions')
    .select('id, fortune_snapshot, locale')
    .eq('id', body.sessionId)
    .eq('user_id', userId)  // 방어적 재확인 (RPC가 이미 user_id 매칭)
    .single();
  if (sessErr || !session) {
    return json({ error: '세션 로드 실패' }, 404);
  }

  // 6. 최근 히스토리 로드 — 최신 N-1개를 역방향으로 가져와 reverse로 시간순 복원.
  //    Claude messages API는 시간순 정렬 필수. ascending=true로 limit(N)을 걸면
  //    세션이 길어질 때 "초기 N개"만 보내 최근 맥락이 단절되는 버그 (2026-04-23 수정).
  const { data: history } = await sbAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', body.sessionId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT - 1); // 이번 턴의 유저 메시지용 슬롯 1개 남김

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = (history ?? [])
    .reverse()
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
  messages.push({ role: 'user', content: message });

  // 7. 유저 메시지 DB 저장 — await 필수. 실패 시 message_count 롤백 후 중단.
  //    fire-and-forget으로 두면 DB 실패 시 다음 턴에 orphan assistant reply로
  //    Claude가 혼란스러운 히스토리를 받음 (2026-04-23 수정).
  const { error: userInsertErr } = await sbAdmin.from('chat_messages').insert({
    session_id: body.sessionId,
    role: 'user',
    content: message,
  });
  if (userInsertErr) {
    console.error('[chat] user msg insert 실패:', userInsertErr.message ?? '-');
    // 증가시켰던 +2 롤백
    await sbAdmin.rpc('decrement_message_count', {
      p_session_id: body.sessionId,
      p_user_id: userId,
      p_decrement: 2,
    });
    return json({ error: 'message_save_failed' }, 500);
  }

  // 8. Claude 스트리밍 호출 — 실패 시 사전 증가된 message_count +2를 롤백.
  //    유저 메시지 DB는 남기지만(실제 발화 기록) 쿼터는 돌려줌.
  let claudeStream: ReadableStream<Uint8Array>;
  try {
    claudeStream = await streamClaude(buildSystemPrompt(session.fortune_snapshot, session.locale ?? 'ko'), messages);
  } catch (e) {
    await sbAdmin.rpc('decrement_message_count', {
      p_session_id: body.sessionId,
      p_user_id: userId,
      p_decrement: 2,
    });
    const msg = e instanceof Error ? e.message : 'AI 오류';
    return json({ error: msg }, 502);
  }

  // 9. SSE 변환: Claude 스트림 → 클라이언트 SSE 포맷
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let assistantFullText = '';

  const outStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // 초기 이벤트: maxMessages 고지
      controller.enqueue(encoder.encode(sseEvent({ maxMessages })));

      const reader = claudeStream.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          // Claude는 SSE를 주므로 이벤트 단위로 파싱
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const part of parts) {
            for (const line of part.split('\n')) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6);
              if (payload === '[DONE]') continue;
              try {
                const evt = JSON.parse(payload);
                if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                  const text = evt.delta.text ?? '';
                  if (text) {
                    assistantFullText += text;
                    controller.enqueue(encoder.encode(sseEvent({ text })));
                  }
                } else if (evt.type === 'error') {
                  controller.enqueue(encoder.encode(sseEvent({ error: evt.error?.message ?? 'stream error' })));
                }
              } catch { /* partial JSON — 무시 */ }
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'stream error';
        controller.enqueue(encoder.encode(sseEvent({ error: msg })));
      } finally {
        controller.close();
      }

      // 10. 스트림 종료 처리:
      //     - 텍스트가 있으면 assistant 메시지 DB 저장
      //     - 텍스트가 비어있으면(스트림 조기 단절) 사전 증가시킨 +2 중 assistant 몫 +1 롤백
      if (assistantFullText) {
        const { error } = await sbAdmin.from('chat_messages').insert({
          session_id: body.sessionId,
          role: 'assistant',
          content: assistantFullText,
          metadata: { model: MODEL, token_count: assistantFullText.length },
        });
        if (error) console.error('[chat] assistant msg insert 실패:', error);
      } else {
        // 스트림은 열렸지만 텍스트 0 — Claude가 중간에 끊어졌거나 rate-limited.
        // 유저 메시지는 이미 DB에 있으니 +1만 유지, assistant 슬롯 +1 반환.
        await sbAdmin.rpc('decrement_message_count', {
          p_session_id: body.sessionId,
          p_user_id: userId,
          p_decrement: 1,
        });
      }
    },
  });

  return new Response(outStream, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
});
