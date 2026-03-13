/**
 * 사주팔자(四柱八字) 계산 엔진
 *
 * 참조:
 * - 천간(天干): 10개 / 지지(地支): 12개 / 60갑자 순환
 * - 일주 기준점: Julian Day Number (JD) 기반
 *   검증: 2000-01-01 = 甲辰日, 1900-01-01 = 甲戌日
 * - 연주 기준: 1924년 = 甲子年 (입춘 보정 포함)
 * - 월주 기준: 인월(寅月) 시작, 연간(年干)에 따라 월간(月干) 결정
 * - 시주 기준: 자시(子時) 시작, 일간(日干)에 따라 시간(時干) 결정
 */

// ─── 천간(天干) ────────────────────────────────────────────────────────
export const STEMS_KO = ['갑','을','병','정','무','기','경','신','임','계'] as const;
export const STEMS_HJ = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'] as const;
export const STEMS_ELEM = ['목','목','화','화','토','토','금','금','수','수'] as const;
export const STEMS_YIN  = [false,true,false,true,false,true,false,true,false,true] as const;

// ─── 지지(地支) ────────────────────────────────────────────────────────
export const BRANCHES_KO   = ['자','축','인','묘','진','사','오','미','신','유','술','해'] as const;
export const BRANCHES_HJ   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'] as const;
export const BRANCHES_ELEM = ['수','토','목','목','토','화','화','토','금','금','토','수'] as const;
// 각 지지의 월 인덱스 (인=2월 기준, 인=0부터)
export const BRANCHES_MONTH = [11,0,1,2,3,4,5,6,7,8,9,10] as const; // 자=11월, 축=12월...

// ─── 오행(五行) ────────────────────────────────────────────────────────
export const ELEM_KO    = ['목','화','토','금','수'] as const;
export const ELEM_HJ    = ['木','火','土','金','水'] as const;
export const ELEM_COLOR = ['#22c55e','#ef4444','#f59e0b','#94a3b8','#3b82f6'] as const;
export const ELEM_EMOJI = ['🌿','🔥','🪨','⚔️','💧'] as const;

export type ElemKo = typeof ELEM_KO[number];
export type StemKo = typeof STEMS_KO[number];
export type BranchKo = typeof BRANCHES_KO[number];

// 오행 상생(相生) 순서: 목→화→토→금→수→목
const GEN_CYCLE: ElemKo[] = ['목','화','토','금','수'];
// 오행 상극(相剋) 순서: 목→토, 화→금, 토→수, 금→목, 수→화
const CTRL_CYCLE: Record<ElemKo, ElemKo> = {
  '목': '토', '화': '금', '토': '수', '금': '목', '수': '화',
};

// ─── 시간 → 지지 매핑 ──────────────────────────────────────────────────
export const TIME_TO_BRANCH: Record<string, number> = {
  '자시': 0,   // 子 23:00–01:00
  '축시': 1,   // 丑 01:00–03:00
  '인시': 2,   // 寅 03:00–05:00
  '묘시': 3,   // 卯 05:00–07:00
  '진시': 4,   // 辰 07:00–09:00
  '사시': 5,   // 巳 09:00–11:00
  '오시': 6,   // 午 11:00–13:00
  '미시': 7,   // 未 13:00–15:00
  '신시': 8,   // 申 15:00–17:00
  '유시': 9,   // 酉 17:00–19:00
  '술시': 10,  // 戌 19:00–21:00
  '해시': 11,  // 亥 21:00–23:00
  '모름': -1,
};

// ─── 사주 타입 ─────────────────────────────────────────────────────────
export interface Pillar {
  stemIdx: number;    // 천간 인덱스 0–9
  branchIdx: number;  // 지지 인덱스 0–11
  stemKo: string;
  branchKo: string;
  stemHj: string;
  branchHj: string;
  stemElem: ElemKo;
  branchElem: ElemKo;
}

export interface SajuResult {
  year:  Pillar;   // 연주(年柱)
  month: Pillar;   // 월주(月柱)
  day:   Pillar;   // 일주(日柱)
  hour:  Pillar;   // 시주(時柱) — 모름이면 stemIdx=-1
  elemCount: Record<ElemKo, number>; // 8자 오행 분포 (시주 미상 시 6자)
  dayElem: ElemKo;   // 일간(日干) = 나의 핵심 오행
  yongsin: ElemKo;   // 용신(用神) = 도움이 되는 오행
  hasHour: boolean;  // 시간 입력 여부
}

export interface FortuneMonth {
  month: number;         // 1–12
  score: number;         // 0–100
  grade: '대길' | '길' | '평' | '주의' | '어려움';
  keywords: string[];
  monthElem: ElemKo;
  color: string;
  description: string;
}

// ─── Julian Day Number 계산 ────────────────────────────────────────────
function julianDayNumber(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

// ─── 기둥(柱) 생성 헬퍼 ───────────────────────────────────────────────
function makePillar(stemIdx: number, branchIdx: number): Pillar {
  return {
    stemIdx,
    branchIdx,
    stemKo:    STEMS_KO[stemIdx],
    branchKo:  BRANCHES_KO[branchIdx],
    stemHj:    STEMS_HJ[stemIdx],
    branchHj:  BRANCHES_HJ[branchIdx],
    stemElem:  STEMS_ELEM[stemIdx] as ElemKo,
    branchElem: BRANCHES_ELEM[branchIdx] as ElemKo,
  };
}

// ─── 연주(年柱) ───────────────────────────────────────────────────────
// 기준: 1924년 = 甲子年 (stem=0, branch=0)
// 입춘(立春, 약 2월 4일) 이전 출생자는 전년도 연주 사용
function calcYearPillar(year: number, month: number, day: number): Pillar {
  // 입춘 기준 (간략화: 2월 4일 이전이면 전년도 연주)
  let y = year;
  if (month < 2 || (month === 2 && day < 4)) y -= 1;
  const stemIdx   = ((y - 1924) % 10 + 10) % 10;
  const branchIdx = ((y - 1924) % 12 + 12) % 12;
  return makePillar(stemIdx, branchIdx);
}

// ─── 월주(月柱) ───────────────────────────────────────────────────────
// 월지(月支): 인(寅)=2월부터 시작, 절기 기준 (간략화: 양력 월 기준)
// 월간(月干): 연간(年干) % 5 에 따라 인월 천간 결정
//   甲/己年 → 인월=丙, 乙/庚年 → 인월=戊, 丙/辛年 → 인월=庚,
//   丁/壬年 → 인월=壬, 戊/癸年 → 인월=甲
const MONTH_START_STEM: Record<number, number> = {
  0: 2,  // 甲/己 → 인월=丙(2)
  1: 4,  // 乙/庚 → 인월=戊(4)
  2: 6,  // 丙/辛 → 인월=庚(6)
  3: 8,  // 丁/壬 → 인월=壬(8)
  4: 0,  // 戊/癸 → 인월=甲(0)
};

function calcMonthPillar(year: number, month: number, day: number, yearStemIdx: number): Pillar {
  // 월지(月支): 인(寅,2)이 1월(양력), 각 월마다 +1
  // 절기 간략화: 양력 1월 → 인월(2), 2월 → 묘월(3), ... 12월 → 축월(1)
  // 실제론 절기 기준이지만 여기선 양력 근사
  // 인=branchIdx 2, 1월이면 인월
  let branchIdx = (month - 1 + 2) % 12; // 1월=인(2), 2월=묘(3)... 11월=축(1), 12월=자(0)

  // 입춘(2월4일) 이전이면 전월 월지 사용 (간략화)
  if (month === 1 || (month === 2 && day < 4)) {
    branchIdx = (month - 1 + 2 + 12 - 1) % 12; // 이전 달
    if (month === 1) branchIdx = 1; // 축월(1)
  }

  // 월간(月干): 인월 시작 천간 + (지지 - 2)
  const startStem = MONTH_START_STEM[yearStemIdx % 5];
  const offset = (branchIdx - 2 + 12) % 12; // 인(2) 기준 오프셋
  const stemIdx = (startStem + offset) % 10;

  return makePillar(stemIdx, branchIdx);
}

// ─── 일주(日柱) ───────────────────────────────────────────────────────
// JD 기준점 검증:
//   JD(1900-01-01) = 2415021 → stem=(2415021+9)%10=0(甲), branch=(2415021+1)%12=10(戌) → 甲戌日 ✓
//   JD(2000-01-01) = 2451545 → stem=(2451545+9)%10=4(戊), branch=(2451545+1)%12=6(午) → 戊午日 ✓
function calcDayPillar(year: number, month: number, day: number): Pillar {
  const jd = julianDayNumber(year, month, day);
  const stemIdx   = ((jd + 9) % 10 + 10) % 10;
  const branchIdx = ((jd + 1) % 12 + 12) % 12;
  return makePillar(stemIdx, branchIdx);
}

// ─── 시주(時柱) ───────────────────────────────────────────────────────
// 일간(日干) % 5 에 따라 자시(子時) 천간 결정
//   甲/己日 → 자시=甲(0), 乙/庚日 → 자시=丙(2), 丙/辛日 → 자시=戊(4),
//   丁/壬日 → 자시=庚(6), 戊/癸日 → 자시=壬(8)
const HOUR_START_STEM: Record<number, number> = {
  0: 0, // 甲/己 → 자시=甲(0)
  1: 2, // 乙/庚 → 자시=丙(2)
  2: 4, // 丙/辛 → 자시=戊(4)
  3: 6, // 丁/壬 → 자시=庚(6)
  4: 8, // 戊/癸 → 자시=壬(8)
};

function calcHourPillar(branchIdx: number, dayStemIdx: number): Pillar {
  if (branchIdx === -1) {
    // 시간 모름 - 빈 기둥
    return {
      stemIdx: -1, branchIdx: -1,
      stemKo: '?', branchKo: '?',
      stemHj: '?', branchHj: '?',
      stemElem: '토', branchElem: '토',
    };
  }
  const startStem = HOUR_START_STEM[dayStemIdx % 5];
  const stemIdx = (startStem + branchIdx) % 10;
  return makePillar(stemIdx, branchIdx);
}

// ─── 오행 분포 계산 ────────────────────────────────────────────────────
function calcElemCount(pillars: Pillar[], hasHour: boolean): Record<ElemKo, number> {
  const count: Record<ElemKo, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const activePillars = hasHour ? pillars : pillars.slice(0, 3);
  for (const p of activePillars) {
    if (p.stemIdx === -1) continue;
    count[p.stemElem]++;
    count[p.branchElem]++;
  }
  return count;
}

// ─── 용신(用神) 계산 ──────────────────────────────────────────────────
// 가장 약한 오행을 생(生)해주는 오행 = 용신
function calcYongsin(elemCount: Record<ElemKo, number>): ElemKo {
  let minElem: ElemKo = '목';
  let minCount = Infinity;
  for (const elem of ELEM_KO) {
    if (elemCount[elem] < minCount) {
      minCount = elemCount[elem];
      minElem = elem;
    }
  }
  // 가장 약한 오행을 생(生)해주는 오행
  const minIdx = GEN_CYCLE.indexOf(minElem);
  return GEN_CYCLE[(minIdx - 1 + 5) % 5];
}

// ─── 메인 사주 계산 ────────────────────────────────────────────────────
export function calculateSaju(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthTime: string = '모름',
): SajuResult {
  const yearPillar  = calcYearPillar(birthYear, birthMonth, birthDay);
  const monthPillar = calcMonthPillar(birthYear, birthMonth, birthDay, yearPillar.stemIdx);
  const dayPillar   = calcDayPillar(birthYear, birthMonth, birthDay);

  const branchIdx = TIME_TO_BRANCH[birthTime] ?? -1;
  const hasHour = branchIdx !== -1;
  const hourPillar = calcHourPillar(branchIdx, dayPillar.stemIdx);

  const allPillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const elemCount  = calcElemCount(allPillars, hasHour);
  const dayElem    = dayPillar.stemElem;
  const yongsin    = calcYongsin(elemCount);

  return {
    year:  yearPillar,
    month: monthPillar,
    day:   dayPillar,
    hour:  hourPillar,
    elemCount,
    dayElem,
    yongsin,
    hasHour,
  };
}

// ─── 2026년 월별 오행 ─────────────────────────────────────────────────
// 丙午年 2026년 각 월의 오행 (月支 기준)
// 1월=인(木), 2월=묘(木), 3월=진(土), 4월=사(火), 5월=오(火), 6월=미(土),
// 7월=신(金), 8월=유(金), 9월=술(土), 10월=해(水), 11월=자(水), 12월=축(土)
const MONTH_ELEM_2026: ElemKo[] = [
  '목','목','토','화','화','토','금','금','토','수','수','토'
];

// 2026년 월별 천간 (丙午年 → 인월=庚, 庚辛壬癸甲乙丙丁戊己)
const MONTH_STEM_2026 = ['경','신','임','계','갑','을','병','정','무','기','경','신'];

// ─── 오행 관계 점수 ────────────────────────────────────────────────────
function elemRelScore(myElem: ElemKo, targetElem: ElemKo): number {
  const myIdx     = GEN_CYCLE.indexOf(myElem);
  const targetIdx = GEN_CYCLE.indexOf(targetElem);
  const diff      = (targetIdx - myIdx + 5) % 5;

  // 인성(印星): 나를 생(生)해주는 오행 → 매우 길
  if (diff === 4) return 25;
  // 식상(食傷): 내가 생(生)하는 오행 → 길
  if (diff === 1) return 15;
  // 비겁(比劫): 같은 오행 → 평
  if (diff === 0) return 5;
  // 재성(財星): 내가 극(剋)하는 오행 → 소길
  if (CTRL_CYCLE[myElem] === targetElem) return 10;
  // 관성(官星): 나를 극(剋)하는 오행 → 흉
  return -20;
}

// ─── 월운(月運) 계산 ──────────────────────────────────────────────────
export function getMonthlyFortune(saju: SajuResult, year: number = 2026): FortuneMonth[] {
  const monthElems = year === 2026
    ? MONTH_ELEM_2026
    : generateMonthElems(year);

  return monthElems.map((monthElem, i) => {
    const month = i + 1;

    // 일간과 월지 오행 관계
    const relScore = elemRelScore(saju.dayElem, monthElem);

    // 용신 보너스
    const yongScore =
      monthElem === saju.yongsin
        ? 15
        : GEN_CYCLE[(GEN_CYCLE.indexOf(monthElem) + 1) % 5] === saju.yongsin
        ? 8
        : CTRL_CYCLE[monthElem] === saju.yongsin
        ? -10
        : 0;

    // 출생일 기반 미세 변동 (각 월마다 다른 느낌)
    const variation = Math.round(
      Math.sin((saju.day.stemIdx * 7 + saju.day.branchIdx * 3 + i) * 0.7) * 8
    );

    const raw = 50 + relScore + yongScore + variation;
    const score = Math.min(100, Math.max(0, raw));

    const grade =
      score >= 80 ? '대길'
      : score >= 65 ? '길'
      : score >= 50 ? '평'
      : score >= 35 ? '주의'
      : '어려움';

    const keywords = getFortuneKeywords(saju.dayElem, monthElem, grade);
    const description = getFortuneDescription(saju.dayElem, monthElem, grade, month);
    const elemIdx = ELEM_KO.indexOf(monthElem);
    const color = ELEM_COLOR[elemIdx];

    return { month, score, grade, keywords, monthElem, color, description };
  });
}

// ─── 키워드 및 설명 생성 ──────────────────────────────────────────────
const KEYWORDS_BY_RELATION: Record<string, string[]> = {
  '인성_길':  ['학업','지혜','귀인 만남','어머니 덕','직관력 상승'],
  '식상_길':  ['창의','표현','자유','여행','새로운 시작'],
  '비겁_평':  ['협력','경쟁','우정','형제 덕','자립심'],
  '재성_소길':['재물','투자','아버지 덕','현실 집중','건강 유의'],
  '관성_흉':  ['압박','규율','직장 스트레스','건강 주의','인내 필요'],
};

function getRelType(myElem: ElemKo, targetElem: ElemKo): string {
  const score = elemRelScore(myElem, targetElem);
  if (score === 25) return '인성_길';
  if (score === 15) return '식상_길';
  if (score === 5)  return '비겁_평';
  if (score === 10) return '재성_소길';
  return '관성_흉';
}

function getFortuneKeywords(myElem: ElemKo, targetElem: ElemKo, grade: string): string[] {
  const relType = getRelType(myElem, targetElem);
  const base = KEYWORDS_BY_RELATION[relType] ?? [];
  // 등급에 따라 2–4개 선택
  const count = grade === '대길' || grade === '길' ? 3 : 2;
  return base.slice(0, count);
}

function getFortuneDescription(
  myElem: ElemKo,
  monthElem: ElemKo,
  grade: string,
  month: number,
): string {
  const relType = getRelType(myElem, monthElem);
  const monthName = `${month}월`;

  const DESCRIPTIONS: Record<string, string[]> = {
    '인성_길': [
      `${monthName}은 ${ELEM_HJ[ELEM_KO.indexOf(monthElem)]}의 기운이 당신을 감싸는 시기입니다. 귀인의 도움을 받거나 새로운 배움의 기회가 찾아옵니다.`,
      `${monthName}은 학문과 지혜가 빛나는 달입니다. 어른이나 스승으로부터 좋은 가르침을 얻을 수 있습니다.`,
    ],
    '식상_길': [
      `${monthName}은 당신의 재능과 표현력이 돋보이는 시기입니다. 창의적인 프로젝트나 새로운 아이디어를 실행하기 좋습니다.`,
      `${monthName}은 자유와 여행의 기운이 가득합니다. 새로운 경험을 통해 성장하는 달입니다.`,
    ],
    '비겁_평': [
      `${monthName}은 주변 사람들과의 협력이 중요한 시기입니다. 혼자보다 함께 할 때 더 좋은 결과가 나옵니다.`,
      `${monthName}은 경쟁과 협력이 교차하는 달입니다. 동료와의 관계를 잘 살피세요.`,
    ],
    '재성_소길': [
      `${monthName}은 재물과 현실적인 성과에 집중하는 시기입니다. 투자나 사업 관련 결정은 신중하게 하세요.`,
      `${monthName}은 건강 관리에 특별히 신경 쓰는 것이 좋습니다. 무리하지 말고 체력을 비축하세요.`,
    ],
    '관성_흉': [
      `${monthName}은 외부 압박이 강해질 수 있는 시기입니다. 직장이나 사회적 책임이 무겁게 느껴질 수 있으나 인내하면 지납니다.`,
      `${monthName}은 스트레스 관리가 중요한 달입니다. 급하게 밀어붙이기보다 때를 기다리는 지혜가 필요합니다.`,
    ],
  };

  const descs = DESCRIPTIONS[relType] ?? [`${monthName}의 운세입니다.`];
  // 출생일 기반으로 두 가지 중 선택
  return descs[month % 2];
}

// ─── 특정 연도 월 오행 생성 ────────────────────────────────────────────
// 연도의 연주를 기반으로 각 월의 월지 오행 계산
function generateMonthElems(year: number): ElemKo[] {
  // 월지(月支): 인(2)부터 시작, 순서대로 12지지 순환
  // 1월=인(목), 2월=묘(목), 3월=진(토), 4월=사(화), 5월=오(화), 6월=미(토),
  // 7월=신(금), 8월=유(금), 9월=술(토), 10월=해(수), 11월=자(수), 12월=축(토)
  const BASE: ElemKo[] = ['목','목','토','화','화','토','금','금','토','수','수','토'];
  void year; // year는 향후 절기 정밀 계산에 사용
  return BASE;
}

// ─── 오늘의 운세 ──────────────────────────────────────────────────────
export function getTodayFortune(saju: SajuResult): {
  score: number;
  grade: string;
  message: string;
  todayElem: ElemKo;
  color: string;
} {
  const now = new Date();
  const dayP = calcDayPillar(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const todayElem = dayP.branchElem;

  const relScore  = elemRelScore(saju.dayElem, todayElem);
  const yongScore = todayElem === saju.yongsin ? 15 : 0;
  const raw   = 50 + relScore + yongScore;
  const score = Math.min(100, Math.max(0, raw));

  const grade =
    score >= 80 ? '대길'
    : score >= 65 ? '길'
    : score >= 50 ? '평'
    : score >= 35 ? '주의'
    : '어려움';

  const messages: Record<string, string> = {
    '대길': `오늘은 ${todayElem}의 기운이 당신을 크게 돕는 날입니다. 적극적으로 행동하세요.`,
    '길':   `오늘은 순탄한 흐름의 날입니다. 계획한 일을 차분히 진행하면 좋겠습니다.`,
    '평':   `오늘은 큰 기복 없이 평온한 날입니다. 일상에 충실하게 지내세요.`,
    '주의': `오늘은 조심스럽게 행동하는 것이 좋습니다. 중요한 결정은 미루세요.`,
    '어려움': `오늘은 에너지가 낮을 수 있습니다. 무리하지 말고 휴식을 취하세요.`,
  };

  const elemIdx = ELEM_KO.indexOf(todayElem);
  const color = ELEM_COLOR[elemIdx];

  return { score, grade, message: messages[grade], todayElem, color };
}

// ─── 연도 천간지지 표시 ────────────────────────────────────────────────
export function getYearGanzhi(year: number): string {
  const stemIdx   = ((year - 1924) % 10 + 10) % 10;
  const branchIdx = ((year - 1924) % 12 + 12) % 12;
  return `${STEMS_KO[stemIdx]}${BRANCHES_KO[branchIdx]}(${STEMS_HJ[stemIdx]}${BRANCHES_HJ[branchIdx]})`;
}

// ─── 오행 분포를 퍼센트로 ─────────────────────────────────────────────
export function elemCountToPercent(
  elemCount: Record<ElemKo, number>,
  hasHour: boolean,
): Record<ElemKo, number> {
  const total = hasHour ? 8 : 6;
  const result = {} as Record<ElemKo, number>;
  for (const elem of ELEM_KO) {
    result[elem] = Math.round((elemCount[elem] / total) * 100);
  }
  return result;
}

// ─── 사주 요약 텍스트 ─────────────────────────────────────────────────
export function getSajuSummary(saju: SajuResult): string {
  const { year, month, day, hour, hasHour } = saju;
  const hourStr = hasHour
    ? `${hour.stemKo}${hour.branchKo}(${hour.stemHj}${hour.branchHj})`
    : '시간미상';
  return `${year.stemKo}${year.branchKo}년 ${month.stemKo}${month.branchKo}월 ${day.stemKo}${day.branchKo}일 ${hourStr}시`;
}

// 2026년 월별 천간 (표시용)
export { MONTH_STEM_2026 };
