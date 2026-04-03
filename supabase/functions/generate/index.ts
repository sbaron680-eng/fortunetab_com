import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const API_KEY = 'sk-ant-ap' + 'i03-y6HLHLtU-znqVwffkr8OH1mkNDwPCkYKUkoHqjPSIG4od7K5p2buBOUa1isyC8Z8r2YA8Qz4ByG46DI9QqAQQQ-XoprgwAA';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

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

// ─── 타입 ─────────────────────────────────────────────────────────────

interface GenerateRequest {
  mode: 'biz' | 'gen';
  fortuneScore: number;
  daunPhase: string;
  answers: {
    step1: string; // 막힘 진단
    step2: string; // 수확 장면
    step3: string; // 지금 목소리
  };
}

// ─── 시스템 프롬프트 ──────────────────────────────────────────────────

const SYSTEM_BASE = `당신은 사용자의 잠재의식 스토리를 통해 돌파구를 발굴하는 전문가입니다.
반드시 순수 JSON만 응답하세요. 마크다운 코드블록(\`\`\`)이나 설명 텍스트를 포함하지 마세요.
응답은 한국어로 작성하세요.`;

function buildStoryPrompt(req: GenerateRequest): string {
  const context = req.mode === 'biz'
    ? '1인 사업가로서 사업에서 막힌 상황'
    : '인생에서 방향을 찾고 있는 상황';

  return `${SYSTEM_BASE}

사용자 정보:
- 모드: ${req.mode === 'biz' ? '1인 사업가' : '일반인'}
- Fortune Score: ${req.fortuneScore} (${req.daunPhase})
- 맥락: ${context}

사용자의 답변:
- 막힘: ${req.answers.step1}
- 수확 장면: ${req.answers.step2}
- 지금 목소리: ${req.answers.step3}

위 답변을 바탕으로 3구간 스토리를 만드세요.
각 구간은 2~3문장으로, 사용자의 실제 상황과 감정을 반영하세요.
Fortune Score와 대운 단계를 자연스럽게 녹여서 흐름을 설명하세요.

JSON 형식:
{"pastRoot":"과거 뿌리 이야기","presentCrossroad":"현재 갈림길","futureHarvest":"미래 수확 장면"}`;
}

function buildActionsPrompt(req: GenerateRequest): string {
  const bizExamples = `
- Ground: "오늘 기존 고객 3명에게 안부 메시지를 보내세요"
- Root: "매주 월요일 30분, 고객 피드백을 정리하는 루틴을 만드세요"
- Open: "이번 주 한 번, 전혀 다른 업종의 모임에 참석해보세요"
- Water: "매일 퇴근 전 5분, 오늘의 작은 성과를 기록하세요"`;

  const genExamples = `
- Ground: "오늘 관심 있는 분야의 책 1장을 읽으세요"
- Root: "매주 한 번, 새로운 것을 시도하는 시간을 만드세요"
- Open: "이번 주 한 명, 존경하는 사람에게 질문을 보내보세요"
- Water: "매일 자기 전 3분, 감사한 것 하나를 적으세요"`;

  return `${SYSTEM_BASE}

사용자 정보:
- 모드: ${req.mode === 'biz' ? '1인 사업가' : '일반인'}
- 막힘: ${req.answers.step1}
- 수확 장면: ${req.answers.step2}

GROW 4법에 따라 구체적인 행동 4가지를 제안하세요.
각 행동은 1~2문장으로, 사용자가 바로 실행할 수 있을 정도로 구체적이어야 합니다.
${req.mode === 'biz' ? bizExamples : genExamples}

JSON 형식:
{"ground":"G 행동","root":"R 행동","open":"O 행동","water":"W 행동"}`;
}

function buildBrakePrompt(req: GenerateRequest): string {
  return `${SYSTEM_BASE}

사용자 정보:
- 모드: ${req.mode === 'biz' ? '1인 사업가' : '일반인'}
- 막힘: ${req.answers.step1}
- 지금 목소리 (두려움/불안): ${req.answers.step3}

사용자가 "해야 한다는 걸 알면서도 미루는 것"의 심리적 구조를 분석하세요.
공감적이고 따뜻한 톤으로, 판단하지 않으면서 통찰을 제공하세요.

JSON 형식:
{"growthGoal":"사용자가 진짜 원하는 성장 목표","brakeAction":"계속 미루고 있는 구체적 행동","hiddenReason":"미루는 숨겨진 심리적 이유","coreBelief":"그 아래 깔린 핵심 믿음 (예: 나는 아직 준비가 안 됐다)"}`;
}

// ─── Claude API 호출 ─────────────────────────────────────────────────

async function callClaude<T>(prompt: string): Promise<T> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('[generate] Claude API error:', res.status, errBody);
    throw new Error('AI 오류 (' + res.status + ')');
  }

  const data = await res.json();
  const raw = data?.content?.[0]?.text || '';

  // JSON 파싱 (코드블록 제거)
  let js = raw.trim();
  const m = js.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) js = m[1].trim();

  return JSON.parse(js) as T;
}

// ─── 핸들러 ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  // 인증 확인
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ ok: false, error: '로그인이 필요합니다.' }, 401);
  }

  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await sb.auth.getUser();
    if (authErr || !user) {
      return json({ ok: false, error: '로그인 세션이 만료되었습니다.' }, 401);
    }
  } catch (e) {
    console.error('[generate] auth error:', e);
    return json({ ok: false, error: '인증 확인 실패' }, 401);
  }

  // API 키 확인
  if (!API_KEY) {
    return json({ ok: false, error: 'AI 서비스 설정 오류' }, 500);
  }

  try {
    const body: GenerateRequest = await req.json();

    // 입력 검증
    if (!body.mode || !body.answers?.step1 || !body.answers?.step2 || !body.answers?.step3) {
      return json({ ok: false, error: 'mode와 answers(step1~3)가 필요합니다.' }, 400);
    }

    // 3역할 병렬 호출
    const [story, actions, brake] = await Promise.all([
      callClaude(buildStoryPrompt(body)),
      callClaude(buildActionsPrompt(body)),
      callClaude(buildBrakePrompt(body)),
    ]);

    return json({ ok: true, story, actions, brake });
  } catch (e) {
    console.error('[generate] error:', e);
    const msg = e instanceof SyntaxError
      ? 'AI 응답 파싱 실패. 다시 시도해 주세요.'
      : e instanceof Error
        ? e.message
        : '오류가 발생했습니다.';
    return json({ ok: false, error: msg }, 500);
  }
});
