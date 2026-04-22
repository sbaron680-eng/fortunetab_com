/**
 * FortuneTab — Claude 리포트 생성 프롬프트 (5 Sonnet + 1 Haiku 검수)
 *
 * ◆ 사용처
 *   n8n Code 노드에 이 파일 통째로 붙여넣고,
 *   `buildSonnetRequest('saju_core', input)` 또는 `buildHaikuReviewRequest(sections)`를 호출해
 *   Anthropic API에 보낼 request body를 얻는다.
 *
 * ◆ 모델 (FortuneTab 정책)
 *   Sonnet: claude-sonnet-4-6  (깊이 있는 해석)
 *   Haiku:  claude-haiku-4-5-20251001  (포맷/금지어/면책 검수)
 *
 * ◆ 프롬프트 캐싱
 *   system 배열의 두 번째 블록(PROFILE_BLOCK)에 cache_control: ephemeral 설정.
 *   같은 주문의 5개 Sonnet 호출에서 프로필 블록 재활용 → 입력 토큰 ~90% 절감.
 *
 * ◆ 입력 스키마 (ReportInput)
 *   {
 *     order_number: string,              // 'FT-20260421-WSWF'
 *     user: {
 *       name: string,                    // '박성준'
 *       gender: 'male' | 'female',
 *       birth_date: string,              // 'YYYY-MM-DD' 양력 기준
 *       birth_time: string | number      // '묘시' 또는 0~23 숫자
 *     },
 *     current_year: number,              // 2026
 *     current_date: string               // ISO 'YYYY-MM-DD' — Claude 해석 기준일
 *   }
 *
 * ◆ 출력 JSON 스키마
 *   각 섹션마다 엄격한 스키마 지정. Claude는 반드시 JSON only 반환.
 *
 * ◆ 드리프트 주의
 *   이 파일의 프롬프트를 수정하면 `n8n/workflow.json`의 Code 노드 내용도 동기화 필요.
 *   프롬프트는 한 곳(이 파일)에서만 관리하고, workflow.json은 이 파일을 require/붙여넣기.
 */

// ────────────────────────────────────────────────────────────────────────────
// 공통 상수
// ────────────────────────────────────────────────────────────────────────────

const MODEL_SONNET = 'claude-sonnet-4-6';
const MODEL_HAIKU  = 'claude-haiku-4-5-20251001';

/** FortuneTab 전역 금지어 (CLAUDE.md) */
const BANNED_TERMS = [
  '퓨처매핑', 'Future Mapping',
  '면역맵', 'Immunity Map',
  '120% 행복', '120% happy',
  'STEP 1', 'STEP 2', 'STEP 3', 'STEP 4', 'STEP 5', 'STEP 6',
];

/** FortuneTab 독자 용어 (권장) */
const FT_TERMS = [
  'Fortune Score', 'GROW 4법', '발굴 세션', '운명 흐름',
  '수확 장면', '지금 목소리', '실행 브레이크', '첫 싹', 'First Sprout',
];

// ────────────────────────────────────────────────────────────────────────────
// System 프롬프트 (모든 Sonnet 호출에 공통, 정적)
// ────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `당신은 한국 전통 사주명리학에 깊이 있는 해석가입니다.
동양 명리(사주팔자·십신·신살·대운)를 기반으로, 개인의 구체적 상황에 닿는 조언을 합니다.

[해석 원칙]
1. 단정적 예언 금지. "~할 수 있습니다", "~하는 경향이 있습니다" 식으로 개연성 표현.
2. 사주 분석은 참고 용도이며 전문 상담/의료/법률 결정을 대체하지 않음을 명심.
3. 부정적 프레임 회피. 어려움이 있어도 "어떻게 활용할 것인가"로 제시.
4. 구체적 실천 가능한 조언. 추상적 미사여구 지양.
5. 한국어 경어체. 독자를 "당신"으로 칭함.

[금지어 — 저작권 보호 원칙상 절대 사용 금지]
${BANNED_TERMS.map((t) => `- "${t}"`).join('\n')}

[FortuneTab 독자 용어 — 사용 권장]
${FT_TERMS.map((t) => `- ${t}`).join('\n')}

[출력 규칙]
- 반드시 JSON 객체 하나만 반환. 설명/마크다운/코드펜스 금지.
- 모든 텍스트 필드는 한국어. 한자는 괄호 병기 가능 (예: "庚申(경신)").
- 문장은 완결형. "~다." 또는 "~습니다." 마무리.`;

// ────────────────────────────────────────────────────────────────────────────
// Profile 블록 빌더 (per-user, cacheable)
// ────────────────────────────────────────────────────────────────────────────

/**
 * 생년월일시 블록. Sonnet이 이 정보로 4주8자를 직접 계산한다.
 * 캐시 가능하도록 고유 식별자(order_number) 포함하지 않음 (주문별 캐시 드리프트 방지).
 */
function buildProfileBlock(input) {
  const { user, current_year, current_date } = input;
  const timeKo = typeof user.birth_time === 'number'
    ? `${user.birth_time}시 (24시간제)`
    : user.birth_time;
  const genderKo = user.gender === 'male' ? '남자' : '여자';

  return `[분석 대상]
- 이름: ${user.name}
- 성별: ${genderKo}
- 생년월일: ${user.birth_date} (양력)
- 출생 시간: ${timeKo}

[기준 시점]
- 올해: ${current_year}년
- 오늘: ${current_date}

[필수 계산 작업 — 해석 전 내부에서 수행]
1. 양력 ${user.birth_date} ${timeKo}에 해당하는 사주팔자(四柱八字) 계산.
   - 절기 기준 월주 결정 (예: 1월 6일은 입춘 전이므로 전년도 축월)
   - 자시(23-01시) 야자시/조자시 구분
2. 일간(日干) 확정 및 오행 분포 집계.
3. 용신(用神) 후보 판단 — 일간 강약 + 계절 + 지장간 고려.
4. 대운(大運) 배열 — 성별·월주 기준 순행/역행 결정 + 10년 주기.
5. 현재 나이 기준 대운 위치 + 올해 세운(歲運).

[주의]
- 이 사전 계산 결과는 출력 JSON에 정확한 값으로 반영되어야 합니다.
- 모르는 값은 null. 추측 금지.`;
}

// ────────────────────────────────────────────────────────────────────────────
// 섹션별 유저 프롬프트
// ────────────────────────────────────────────────────────────────────────────

const SECTION_PROMPTS = {

  // ─── 1. 사주 구조 ─────────────────────────────────────────────────────
  saju_core: `[작업]
이 사람의 사주 구조를 분석하세요. 객관적 명리 구조 + 개인 성향 요약.

[출력 JSON 스키마]
{
  "four_pillars": {
    "year":  { "hj": "한자", "ko": "한글", "element": "오행" },
    "month": { "hj": "한자", "ko": "한글", "element": "오행" },
    "day":   { "hj": "한자", "ko": "한글", "element": "오행" },
    "hour":  { "hj": "한자", "ko": "한글", "element": "오행" } | null
  },
  "day_master": {
    "stem": "일간 (예: 丁 정)",
    "element": "오행",
    "strength": "신강" | "신약" | "중화",
    "description": "일간 성향 2-3문장"
  },
  "five_elements": { "wood": 0, "fire": 0, "earth": 0, "metal": 0, "water": 0 },
  "yongsin": {
    "element": "용신 오행",
    "reason": "선정 근거 1-2문장"
  },
  "sipsin_highlight": [
    { "position": "월간/일지/..." , "name": "정관/편재/...", "meaning": "사회적 의미 1문장" }
  ],
  "narrative": "500자 내외. 이 사주의 큰 그림과 타고난 에너지를 독자가 자기 이야기로 느낄 수 있게. 구체적 성향·강점·과제 포함."
}`,

  // ─── 2. 연간 전망 + 대운 ────────────────────────────────────────────
  annual_outlook: `[작업]
현재 대운 10년 흐름 + 올해 세운을 분석하세요. 독자가 "올해 나는 어디에 있는가"를
선명히 이해할 수 있도록.

[출력 JSON 스키마]
{
  "current_daeun": {
    "period": "25-34세 (예시)",
    "pillar_hj": "乙酉",
    "pillar_ko": "을유",
    "theme": "이 10년의 주제 한 문장",
    "opportunities": ["..", "..", ".."],
    "challenges": ["..", ".."],
    "transition_signs": "이 대운의 시작/중간/끝에서 감지될 변화 2-3문장"
  },
  "next_daeun_preview": {
    "period": "다음 대운 나이대",
    "pillar_hj": "한자",
    "one_line": "한 줄 암시"
  },
  "annual_flow": {
    "year": 2026,
    "seun_pillar": "올해 세운 기둥 한자+한글",
    "theme": "올해 주제",
    "quarters": {
      "q1": "1-3월 흐름 한 문장",
      "q2": "4-6월 흐름 한 문장",
      "q3": "7-9월 흐름 한 문장",
      "q4": "10-12월 흐름 한 문장"
    },
    "key_months": [
      { "month": 3, "why": "왜 중요한지 한 문장", "action": "권장 행동" }
    ]
  },
  "narrative": "600자 내외. 10년 큰 물결 안에서 올해의 위치를 그려줄 것. 거시→미시 순서."
}`,

  // ─── 3. 월별 세운 12개 ────────────────────────────────────────────────
  monthly_seun: `[작업]
올해 1월부터 12월까지 매월의 세운을 분석하세요. 플래너 월간 페이지에 삽입될
사이드바 형태로.

[출력 JSON 스키마]
{
  "months": [
    {
      "month": 1,
      "seun_pillar_ko": "해당 월주 (예: 경인)",
      "energy": "이 달의 기운 한 문장 (20자 이내)",
      "focus": "집중할 영역 1문장",
      "watch_out": "주의할 점 1문장",
      "keyword": "핵심 키워드 (2-4자, 예: '인연', '정비', '수확')",
      "color_tone": "이 달의 색감 한 단어 (예: '깊은 남색', '따뜻한 황토')"
    }
    // ... 2월부터 12월까지 동일 구조, 총 12개
  ]
}

[엄수]
- months 배열은 반드시 12개. 1월~12월 순서.
- 각 달의 keyword는 서로 겹치지 않게.
- 전체 흐름에 내러티브 arc가 있게 (시작→축적→전환→결실→정리).`,

  // ─── 4. 행동 가이드 (GROW 4법) ─────────────────────────────────────────
  action_guide: `[작업]
이 사주 프로필에 맞는 올해 실행 가이드를 GROW 4법(FortuneTab 독자 용어)으로
구성하세요. 추상적 조언이 아닌 이번 주/이번 달에 시도할 수 있는 구체적 행동.

[출력 JSON 스키마]
{
  "grow_four": {
    "goal": {
      "title": "목표 설정 — 올해 당신이 닿을 곳",
      "items": ["행동 가능한 목표 3-4개"]
    },
    "reality": {
      "title": "현재 지점 — 사주가 보여주는 당신의 지금",
      "items": ["현실 직시 항목 3-4개"]
    },
    "options": {
      "title": "선택지 — 사주 구조가 열어주는 길",
      "items": ["구체적 경로 3-4개"]
    },
    "will": {
      "title": "결심 — 첫 7일 실행안",
      "items": ["오늘/이번 주 실천 사항 3-4개"]
    }
  },
  "weekly_habits": [
    { "day": "월", "habit": "이 사주에 맞는 주간 루틴" },
    { "day": "수", "habit": "..." },
    { "day": "금", "habit": "..." },
    { "day": "일", "habit": "..." }
  ],
  "first_sprout": "첫 싹 (First Sprout) — 지금 바로 3분 안에 할 수 있는 한 가지. 구체적 동작 1문장."
}

[엄수]
- 모든 items는 실행 동사로 시작 ("~하기", "~쓰기", "~만나기").
- 추상적 단어(성장, 발전, 변화) 단독 사용 금지 → 구체 행동으로.
- first_sprout은 반드시 3분 이내 실행 가능한 것.`,

  // ─── 5. 핵심 통찰 + 경고 ─────────────────────────────────────────────
  insight_highlight: `[작업]
이 리포트 전체에서 독자가 가장 오래 기억해야 할 것 3가지 + 주의할 점을 뽑으세요.
리포트 첫 페이지 또는 요약 카드에 들어갈 내용.

[출력 JSON 스키마]
{
  "top_insights": [
    {
      "title": "통찰 제목 (12자 이내)",
      "body": "100자 내외 설명. 독자 스스로 '맞다, 이게 나다'라 느낄 수준의 구체성."
    }
    // 정확히 3개
  ],
  "watchouts": [
    {
      "area": "영역 (건강/재물/관계/업무 등)",
      "caution": "주의 사항 1문장",
      "timing": "언제 주의할지 (예: '6월~8월', '대운 후반기')"
    }
    // 2-3개
  ],
  "one_line": "이 사람의 올해를 한 줄로 요약 — 30자 이내. 독자가 포스트잇에 써서 붙여둘 수 있게."
}

[엄수]
- top_insights는 정확히 3개.
- 각 insight는 서로 다른 축을 건드릴 것 (예: 성격/관계/시기).
- one_line은 명사형 또는 동사형. 설교체 금지.`,
};

// ────────────────────────────────────────────────────────────────────────────
// Sonnet 요청 빌더
// ────────────────────────────────────────────────────────────────────────────

/**
 * 5개 Sonnet 섹션 중 하나에 대한 Anthropic API request body 생성.
 *
 * @param {'saju_core'|'annual_outlook'|'monthly_seun'|'action_guide'|'insight_highlight'} section
 * @param {object} input  ReportInput (위 JSDoc 참조)
 * @returns {object} Anthropic /v1/messages POST body
 */
function buildSonnetRequest(section, input) {
  if (!SECTION_PROMPTS[section]) {
    throw new Error(`Unknown section: ${section}`);
  }
  return {
    model: MODEL_SONNET,
    max_tokens: section === 'monthly_seun' ? 8000 : 5000,
    temperature: 0.7,
    system: [
      { type: 'text', text: SYSTEM_PROMPT },
      {
        type: 'text',
        text: buildProfileBlock(input),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: SECTION_PROMPTS[section] },
    ],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Haiku 검수 패스 (6번째 호출)
// ────────────────────────────────────────────────────────────────────────────

const HAIKU_REVIEW_SYSTEM = `당신은 FortuneTab 리포트 편집 검수자입니다.
5개 섹션의 JSON을 받아 다음을 검증하고 수정합니다.

[검증 항목]
1. 금지어 포함 여부 — 포함 시 의미 보존하며 교체.
   금지: ${BANNED_TERMS.join(', ')}
2. 모든 narrative/설명 필드에 단정적 예언 없는지 ("~할 것이다", "반드시", "틀림없이" 검출).
3. JSON 스키마 유효성 — 필수 필드 누락/타입 오류 찾기.
4. monthly_seun.months 배열 12개 확인.
5. top_insights 정확히 3개 확인.

[출력 규칙]
- 반드시 JSON 하나만 반환. 설명 금지.
- 수정이 필요하면 fixed_sections에 교체된 섹션만 포함.
- 수정 불필요면 fixed_sections: {}.`;

/**
 * 5개 Sonnet 섹션 결과를 받아 검수 Haiku 요청 생성.
 *
 * @param {object} sections  { saju_core, annual_outlook, monthly_seun, action_guide, insight_highlight }
 * @returns {object} Anthropic /v1/messages POST body
 */
function buildHaikuReviewRequest(sections) {
  const userPrompt = `[검수 대상]
${JSON.stringify(sections, null, 2)}

[출력 JSON 스키마]
{
  "ok": true | false,
  "issues": [
    { "section": "saju_core" | ..., "problem": "..", "severity": "low" | "med" | "high" }
  ],
  "fixed_sections": {
    // 문제 있는 섹션만 완전한 새 JSON으로 교체 (원본 스키마 유지).
    // 문제 없으면 빈 객체 {}.
  }
}`;

  return {
    model: MODEL_HAIKU,
    max_tokens: 8000,
    temperature: 0.2,
    system: HAIKU_REVIEW_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Claude 응답 파서 (JSON 추출)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Anthropic API 응답에서 JSON 본문만 추출. 간혹 모델이 코드펜스를 붙이면 제거.
 * @param {object} apiResponse  /v1/messages 응답
 * @returns {object} 파싱된 JSON 객체
 */
function extractJson(apiResponse) {
  const text = apiResponse?.content?.[0]?.text ?? '';
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Haiku 검수 결과를 Sonnet 5개 섹션에 머지. fixed_sections에 있는 건 교체.
 * @param {object} sonnetSections  5개 섹션 원본
 * @param {object} haikuReview     Haiku 파싱된 JSON
 * @returns {object} 최종 5개 섹션
 */
function applyHaikuReview(sonnetSections, haikuReview) {
  if (!haikuReview || haikuReview.ok === true) return sonnetSections;
  const fixed = haikuReview.fixed_sections || {};
  return { ...sonnetSections, ...fixed };
}

// ────────────────────────────────────────────────────────────────────────────
// Exports — n8n Code 노드에선 return으로, Node.js에선 module.exports로
// ────────────────────────────────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MODEL_SONNET,
    MODEL_HAIKU,
    SECTION_PROMPTS,
    SYSTEM_PROMPT,
    buildProfileBlock,
    buildSonnetRequest,
    buildHaikuReviewRequest,
    extractJson,
    applyHaikuReview,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 테스트 사용법 (Node.js 로컬):
//
//   const p = require('./claude-prompts.js');
//   const input = {
//     order_number: 'FT-20260421-WSWF',
//     user: { name: '박성준', gender: 'male', birth_date: '1979-01-06', birth_time: '묘시' },
//     current_year: 2026,
//     current_date: '2026-04-22',
//   };
//   const req = p.buildSonnetRequest('saju_core', input);
//   // fetch('https://api.anthropic.com/v1/messages', { method:'POST', headers:{
//   //   'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01',
//   //   'content-type': 'application/json'
//   // }, body: JSON.stringify(req) }).then(r=>r.json()).then(p.extractJson).then(console.log);
//
// 예상 오류:
//   1. `Unknown section: xxx` — buildSonnetRequest에 잘못된 섹션명 전달.
//   2. `JSON.parse` 실패 — Claude가 코드펜스 아닌 다른 형식 반환. extractJson 보강 필요.
//   3. max_tokens 초과 — monthly_seun 12개가 길면 6000 토큰 한계 넘을 수 있음, 그 경우
//      SECTION_PROMPTS.monthly_seun을 6개씩 2회로 분할.
// ═══════════════════════════════════════════════════════════════════════════
