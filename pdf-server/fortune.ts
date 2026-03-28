/**
 * Fortune API — Claude 기반 사주/별자리/궁합/오늘의운세 분석
 * Planner-001 프롬프트 구조 + FortuneTab saju.ts 엔진 결합
 */
import Anthropic from '@anthropic-ai/sdk';

// tsx의 ESM 캐시 문제로 동적 import 사용
const saju = await import('../src/lib/saju.js');
const {
  calculateSaju, getSipsinMap, detectSinsal, calcDaeun,
  detectZodiac, getYearGanzhi, elemCountToPercent,
  ZODIAC_SYMBOL, ZODIAC_ELEMENT,
} = saju;

const client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 자동 사용

// ── 타입 ──────────────────────────────────────────────────────
export interface FortuneRequest {
  type: 'saju' | 'astrology' | 'couple' | 'daily';
  input: Record<string, unknown>;
}

export interface FortuneResponse {
  summary: string;
  yearly_fortune: string;
  relationships: string;
  career: string;
  wealth: string;
  health: string;
  lucky_colors: string[];
  lucky_numbers: number[];
  lucky_directions?: string[];
  ohhaeng_balance?: Record<string, number>;
  shinsal?: string[];
  caution_months?: number[];
  saju_advice?: string;
  day_master?: string;
  compatibility_score?: number;
  compatibility_summary?: string;
  couple_advice?: string;
  couple_caution?: string;
  zodiac?: string;
  monthly_fortunes: Array<{
    month: number;
    fortune: string;
    score: number;
    keywords: string[];
  }>;
}

// ── 사주 컨텍스트 빌드 (자체 엔진 계산 결과를 프롬프트에 포함) ──
function buildSajuContext(birthDate: string, birthTime: string, gender: string, year: number) {
  const [y, m, d] = birthDate.split('-').map(Number);
  const timeMap: Record<string, string> = {
    '자시':'자시','축시':'축시','인시':'인시','묘시':'묘시',
    '진시':'진시','사시':'사시','오시':'오시','미시':'미시',
    '신시':'신시','유시':'유시','술시':'술시','해시':'해시',
  };
  const saju = calculateSaju(y, m, d, timeMap[birthTime] || '모름');
  const sipsin = getSipsinMap(saju);
  const sinsal = detectSinsal(saju);
  const daeun = calcDaeun(saju, gender);
  const elemPct = elemCountToPercent(saju.elemCount, saju.hasHour);
  const zodiac = detectZodiac(m, d);

  return {
    saju,
    context: `
【 사주 엔진 계산 결과 (정확한 데이터) 】
• 사주 원국: ${saju.year.stemKo}${saju.year.branchKo}년 ${saju.month.stemKo}${saju.month.branchKo}월 ${saju.day.stemKo}${saju.day.branchKo}일 ${saju.hasHour ? saju.hour.stemKo+saju.hour.branchKo+'시' : '시간미상'}
• 일간(日干): ${saju.day.stemKo}(${saju.day.stemHj}) — ${saju.day.stemElem}행
• 십신 배치: 년간=${sipsin.yearStem} 월간=${sipsin.monthStem} 시간=${sipsin.hourStem}
• 오행 분포: 목${elemPct.목}% 화${elemPct.화}% 토${elemPct.토}% 금${elemPct.금}% 수${elemPct.수}%
• 용신(用神): ${saju.yongsin}행
• 신살: ${sinsal.length > 0 ? sinsal.map(s => s.name).join(', ') : '특별한 신살 없음'}
• 대운 흐름: ${daeun.slice(0, 5).map(d => `${d.startAge}세:${d.stemKo}${d.branchKo}(${d.sipsin})`).join(' → ')}
• 별자리: ${zodiac} ${ZODIAC_SYMBOL[zodiac]}
• 분석 연도: ${year}년 (${getYearGanzhi(year)})`.trim(),
    zodiac,
  };
}

// ── 사주 분석 프롬프트 ─────────────────────────────────────────
function buildSajuPrompt(input: Record<string, unknown>): string {
  const name = (input.name as string) || '사용자';
  const birthDate = input.birth_date as string;
  const birthTime = (input.birth_time as string) || '모름';
  const gender = (input.gender as string) || 'male';
  const year = (input.year as number) || 2026;

  const { context } = buildSajuContext(birthDate, birthTime, gender, year);

  return `당신은 30년 경력의 한국 사주명리학 전문가입니다.
아래 사주 엔진이 계산한 정확한 데이터를 기반으로 ${year}년 운세를 심층 분석해주세요.

• 이름: ${name}
• 생년월일: ${birthDate}
• 성별: ${gender === 'male' ? '남성' : '여성'}

${context}

【 분석 가이드라인 】
1. 위 사주 엔진 데이터를 신뢰하고, 일간 중심으로 분석하세요.
2. 오행 균형과 용신을 기반으로 올해의 길흉을 판단하세요.
3. 신살이 있다면 그 영향을 구체적으로 해석하세요.
4. 한국어로 따뜻하고 희망적인 톤, 조심할 부분도 솔직하게 언급하세요.
5. 월별 운세의 score는 1~10 정수로 일관성 있게 부여하세요.

다음 JSON 형식으로만 응답하세요:
{
  "summary": "종합 운세 요약 — 200자 내외",
  "yearly_fortune": "연간 운세 상세 — 300자 내외",
  "relationships": "인간관계·사랑운 — 150자 내외",
  "career": "직업·사업·학업운 — 150자 내외",
  "wealth": "금전·재물·투자운 — 150자 내외",
  "health": "건강·체력·정신건강 — 100자 내외",
  "lucky_colors": ["행운색1", "행운색2", "행운색3"],
  "lucky_numbers": [숫자1, 숫자2, 숫자3],
  "lucky_directions": ["행운방향1", "행운방향2"],
  "day_master": "일간 설명",
  "ohhaeng_balance": {"목": 비율, "화": 비율, "토": 비율, "금": 비율, "수": 비율},
  "shinsal": ["신살명 (설명)"],
  "caution_months": [조심할 월],
  "saju_advice": "구체적 행동 지침 — 150자 내외",
  "monthly_fortunes": [
    {"month": 1, "fortune": "1월 운세 80자 내외", "score": 정수1에서10, "keywords": ["키워드1", "키워드2"]},
    {"month": 2, "fortune": "2월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 3, "fortune": "3월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 4, "fortune": "4월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 5, "fortune": "5월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 6, "fortune": "6월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 7, "fortune": "7월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 8, "fortune": "8월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 9, "fortune": "9월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 10, "fortune": "10월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 11, "fortune": "11월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]},
    {"month": 12, "fortune": "12월 운세", "score": 정수, "keywords": ["키워드1", "키워드2"]}
  ]
}`;
}

// ── 궁합 프롬프트 ──────────────────────────────────────────────
function buildCouplePrompt(input: Record<string, unknown>): string {
  const p1 = input.person1 as Record<string, string>;
  const p2 = input.person2 as Record<string, string>;
  const year = (input.year as number) || 2026;

  const c1 = buildSajuContext(p1.birth_date, p1.birth_time || '모름', p1.gender || 'female', year);
  const c2 = buildSajuContext(p2.birth_date, p2.birth_time || '모름', p2.gender || 'male', year);

  return `당신은 30년 경력의 한국 사주명리학 전문가이자 궁합 상담가입니다.
두 사람의 사주를 분석하여 ${year}년 커플 궁합을 심층 분석해주세요.

【 첫 번째 사람: ${p1.name || 'A'} 】
${c1.context}

【 두 번째 사람: ${p2.name || 'B'} 】
${c2.context}

【 분석 가이드라인 】
1. 두 사람의 일간 오행 상생·상극 관계를 분석하세요.
2. 궁합 점수는 100점 만점, 60점 이상이 좋은 궁합입니다.
3. 장점과 단점을 균형 있게 서술하고, 관계 발전을 위한 실질적 조언을 제공하세요.

다음 JSON 형식으로만 응답하세요:
{
  "summary": "종합 궁합 요약 — 200자",
  "yearly_fortune": "${year}년 두 사람의 관계 흐름 — 300자",
  "compatibility_score": 궁합점수_0~100,
  "compatibility_summary": "궁합 한 줄 평가 — 30자",
  "relationships": "감정적 교감·소통 궁합 — 150자",
  "career": "함께하는 목표 궁합 — 100자",
  "wealth": "경제적 가치관 궁합 — 100자",
  "health": "생활리듬 조화 — 80자",
  "couple_advice": "관계를 더 좋게 만드는 조언 — 150자",
  "couple_caution": "갈등 상황과 해결법 — 100자",
  "lucky_colors": ["두 사람에게 좋은 색1", "색2"],
  "lucky_numbers": [숫자1, 숫자2],
  "monthly_fortunes": [{"month":1,"fortune":"1월 운세 80자","score":7,"keywords":["키워드1","키워드2"]},{"month":2,"fortune":"2월","score":6,"keywords":["키워드1","키워드2"]},{"month":3,"fortune":"3월","score":5,"keywords":["키워드1","키워드2"]},{"month":4,"fortune":"4월","score":8,"keywords":["키워드1","키워드2"]},{"month":5,"fortune":"5월","score":7,"keywords":["키워드1","키워드2"]},{"month":6,"fortune":"6월","score":6,"keywords":["키워드1","키워드2"]},{"month":7,"fortune":"7월","score":4,"keywords":["키워드1","키워드2"]},{"month":8,"fortune":"8월","score":7,"keywords":["키워드1","키워드2"]},{"month":9,"fortune":"9월","score":8,"keywords":["키워드1","키워드2"]},{"month":10,"fortune":"10월","score":6,"keywords":["키워드1","키워드2"]},{"month":11,"fortune":"11월","score":5,"keywords":["키워드1","키워드2"]},{"month":12,"fortune":"12월","score":7,"keywords":["키워드1","키워드2"]}]
}`;
}

// ── 별자리 프롬프트 ────────────────────────────────────────────
function buildAstrologyPrompt(input: Record<string, unknown>): string {
  const name = (input.name as string) || '사용자';
  const birthDate = input.birth_date as string;
  const year = (input.year as number) || 2026;
  const [, m, d] = birthDate.split('-').map(Number);
  const zodiac = (input.zodiac as string) || detectZodiac(m, d);
  const elem = ZODIAC_ELEMENT[zodiac as keyof typeof ZODIAC_ELEMENT] || '';

  return `당신은 20년 경력의 서양 점성술 전문가입니다.
${year}년 ${zodiac}(${elem}) 운세를 심층 분석해주세요.

• 이름: ${name}
• 생년월일: ${birthDate}
• 별자리: ${zodiac} ${ZODIAC_SYMBOL[zodiac as keyof typeof ZODIAC_SYMBOL] || ''}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "종합 운세 요약 — 200자",
  "yearly_fortune": "연간 운세 상세 — 300자",
  "relationships": "사랑·인간관계운 — 150자",
  "career": "직업·창의·성장운 — 150자",
  "wealth": "금전·기회운 — 150자",
  "health": "건강·에너지 — 100자",
  "lucky_colors": ["행운색1", "행운색2"],
  "lucky_numbers": [숫자1, 숫자2, 숫자3],
  "zodiac": "${zodiac}",
  "monthly_fortunes": [{"month":1,"fortune":"1월 운세 80자","score":7,"keywords":["키워드1","키워드2"]},{"month":2,"fortune":"2월","score":6,"keywords":["키워드1","키워드2"]},{"month":3,"fortune":"3월","score":5,"keywords":["키워드1","키워드2"]},{"month":4,"fortune":"4월","score":8,"keywords":["키워드1","키워드2"]},{"month":5,"fortune":"5월","score":7,"keywords":["키워드1","키워드2"]},{"month":6,"fortune":"6월","score":6,"keywords":["키워드1","키워드2"]},{"month":7,"fortune":"7월","score":4,"keywords":["키워드1","키워드2"]},{"month":8,"fortune":"8월","score":7,"keywords":["키워드1","키워드2"]},{"month":9,"fortune":"9월","score":8,"keywords":["키워드1","키워드2"]},{"month":10,"fortune":"10월","score":6,"keywords":["키워드1","키워드2"]},{"month":11,"fortune":"11월","score":5,"keywords":["키워드1","키워드2"]},{"month":12,"fortune":"12월","score":7,"keywords":["키워드1","키워드2"]}]
}`;
}

// ── 오늘의 운세 프롬프트 ───────────────────────────────────────
function buildDailyPrompt(input: Record<string, unknown>): string {
  const zodiac = input.zodiac as string;
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return `당신은 점성술 전문가입니다. ${today} ${zodiac}의 오늘 운세를 분석해주세요.
짧고 명확하게, 실질적 조언 중심으로 작성하세요.

다음 JSON 형식으로만 응답하세요:
{
  "summary": "오늘의 종합 운세 — 100자",
  "yearly_fortune": "오늘 주의할 점과 기회 — 80자",
  "relationships": "오늘의 인간관계 — 60자",
  "career": "오늘의 업무 운세 — 60자",
  "wealth": "오늘의 금전 운세 — 60자",
  "health": "오늘의 건강 — 50자",
  "lucky_colors": ["오늘의 행운색"],
  "lucky_numbers": [행운숫자1, 행운숫자2],
  "zodiac": "${zodiac}",
  "monthly_fortunes": []
}`;
}

// ── Claude API 호출 ────────────────────────────────────────────
async function callClaude(prompt: string, maxTokens = 2800): Promise<FortuneResponse> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: '당신은 JSON으로만 응답하는 운세 분석 전문 API입니다. 반드시 유효한 JSON만 출력하세요. 다른 텍스트, 인사말, 설명은 절대 포함하지 마세요.',
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  // JSON 블록 추출 + 정리
  let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];
  // trailing commas 제거
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(cleaned) as FortuneResponse;
  } catch (e) {
    const err = e as SyntaxError;
    const pos = err.message.match(/position (\d+)/)?.[1];
    if (pos) {
      const p = parseInt(pos);
      console.error('[Fortune] JSON error near position', p, ':', JSON.stringify(cleaned.substring(Math.max(0,p-100), p+100)));
    }
    // 마지막 수단: 불완전 JSON 복구 시도
    // 1. "...N개" 패턴 제거
    cleaned = cleaned.replace(/\.\.\.\s*\d+개[^\]]*\]/, ']');
    // 2. score: 1~10 → score: 5
    cleaned = cleaned.replace(/:\s*(\d+)~(\d+)/g, ': $1');
    // 3. 정수 → 실제 정수
    cleaned = cleaned.replace(/:\s*정수\s*/g, ': 5');
    // 4. 줄여쓰기("..." 만 있는 월 항목) 제거
    cleaned = cleaned.replace(/\{[^}]*"fortune"\s*:\s*"\.{3}"[^}]*\},?/g, '');
    try {
      return JSON.parse(cleaned) as FortuneResponse;
    } catch {
      console.error('[Fortune] Final JSON (first 500):', cleaned.substring(0, 500));
      throw new Error('Claude 응답 JSON 파싱 실패. 재시도해 주세요.');
    }
  }
}

// ── 메인 핸들러 ────────────────────────────────────────────────
export async function handleFortune(req: FortuneRequest): Promise<FortuneResponse> {
  let prompt: string;
  let maxTokens = 4096;

  switch (req.type) {
    case 'saju':
      prompt = buildSajuPrompt(req.input);
      break;
    case 'couple':
      prompt = buildCouplePrompt(req.input);
      maxTokens = 4096;
      break;
    case 'astrology':
      prompt = buildAstrologyPrompt(req.input);
      break;
    case 'daily':
      prompt = buildDailyPrompt(req.input);
      maxTokens = 800;
      break;
    default:
      throw new Error('지원하지 않는 운세 유형입니다.');
  }

  return callClaude(prompt, maxTokens);
}
