/**
 * zodiac-fortune.ts
 * 12동물 띠 기반 보편 운세 생성 (비로그인/생년월일 미입력 사용자용)
 * 출생 연도만으로 띠를 결정하고, 대상 연도의 오행 관계로 운세를 산출합니다.
 */

import type { PlannerFortuneData, MonthlyFortuneText } from './fortune-text';
import { ELEM_KO, ELEM_EMOJI, STEMS_ELEM, BRANCHES_ELEM } from './saju';
import type { ElemKo } from './saju';

// ── 12동물 띠 데이터 ──────────────────────────────────────────────────────────

export const ANIMALS_KO = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'] as const;
const ANIMALS_EMOJI     = ['🐭','🐮','🐯','🐰','🐲','🐍','🐴','🐑','🐵','🐔','🐶','🐷'] as const;
// 지지 오행: 자(수), 축(토), 인(목), 묘(목), 진(토), 사(화), 오(화), 미(토), 신(금), 유(금), 술(토), 해(수)
const ANIMAL_ELEM: ElemKo[] = ['수','토','목','목','토','화','화','토','금','금','토','수'];

export function getAnimalByBirthYear(birthYear: number): { animal: string; emoji: string; elem: ElemKo } {
  const idx = (birthYear - 4) % 12;  // 서기 4년 = 쥐띠 기준
  const safeIdx = ((idx % 12) + 12) % 12;
  return {
    animal: ANIMALS_KO[safeIdx],
    emoji: ANIMALS_EMOJI[safeIdx],
    elem: ANIMAL_ELEM[safeIdx],
  };
}

// ── 오행 관계 스코어 (saju.ts의 elemRelScore와 동일 로직) ──────────────────────

const GEN_CYCLE: ElemKo[] = ['목','화','토','금','수'];
const CTRL_MAP: Record<ElemKo, ElemKo> = { '목':'토', '토':'수', '수':'화', '화':'금', '금':'목' };

function elemRelScore(myElem: ElemKo, targetElem: ElemKo): number {
  const myIdx     = GEN_CYCLE.indexOf(myElem);
  const targetIdx = GEN_CYCLE.indexOf(targetElem);
  const diff      = (targetIdx - myIdx + 5) % 5;
  if (diff === 4) return 25;  // 인성 (나를 생해줌)
  if (diff === 1) return 15;  // 식상 (내가 생함)
  if (diff === 0) return 5;   // 비겁 (같은 오행)
  if (CTRL_MAP[myElem] === targetElem) return 10; // 재성 (내가 극함)
  return -5;  // 관성 (나를 극함)
}

// ── 대상 연도의 천간 오행 추출 ──────────────────────────────────────────────────

function getYearElem(year: number): ElemKo {
  const stemIdx = (year - 4) % 10;
  return STEMS_ELEM[((stemIdx % 10) + 10) % 10] as ElemKo;
}

// ── 월별 지지 오행 (음력 기준 근사: 1월=인(목), 2월=묘(목), ...) ────────────────

const MONTH_BRANCH_ELEM: ElemKo[] = ['목','목','토','화','화','토','금','금','토','수','수','토'];
// 1월=인(목), 2월=묘(목), 3월=진(토), 4월=사(화), 5월=오(화), 6월=미(토),
// 7월=신(금), 8월=유(금), 9월=술(토), 10월=해(수), 11월=자(수), 12월=축(토)

// ── 등급 판정 ─────────────────────────────────────────────────────────────────

function scoreToGrade(score: number): string {
  if (score >= 75) return '대길';
  if (score >= 60) return '길';
  if (score >= 45) return '평';
  if (score >= 30) return '주의';
  return '어려움';
}

const GRADE_SYMBOL: Record<string, string> = {
  '대길': '◉', '길': '●', '평': '○', '주의': '△', '어려움': '▽',
};

// ── 키워드 매핑 ───────────────────────────────────────────────────────────────

const KEYWORDS_BY_REL: Record<string, string[]> = {
  '인성': ['학업', '지혜', '귀인 만남'],
  '식상': ['창의력', '표현력', '새 기회'],
  '비겁': ['경쟁', '자기관리', '균형'],
  '재성': ['재물', '실천력', '성취'],
  '관성': ['시련', '인내', '성장 기회'],
};

function getRelType(score: number): string {
  if (score === 25) return '인성';
  if (score === 15) return '식상';
  if (score === 5)  return '비겁';
  if (score === 10) return '재성';
  return '관성';
}

// ── 일간 다짐 (띠 오행 기반, 결정적) ────────────────────────────────────────────

const ZODIAC_AFFIRMATIONS: Record<ElemKo, string> = {
  '목': '새싹이 자라듯 꾸준한 성장을 이어갑니다.',
  '화': '열정을 잃지 않고 밝은 에너지로 하루를 채웁니다.',
  '토': '단단한 기반 위에 차분히 나아갑니다.',
  '금': '맑은 판단력으로 핵심에 집중합니다.',
  '수': '유연한 지혜로 변화를 받아들입니다.',
};

// ── 보편 운세 (출생 정보 없이 대상 연도만으로 생성) ──────────────────────────────

const YEAR_AFFIRMATION: Record<ElemKo, string> = {
  '목': '새로운 시작의 에너지가 넘치는 한 해, 도전을 두려워 마세요.',
  '화': '열정과 활력이 빛나는 한 해, 적극적으로 움직이세요.',
  '토': '안정과 신뢰를 쌓는 한 해, 기반을 단단히 다지세요.',
  '금': '결실과 성취의 한 해, 핵심에 집중하면 좋은 결과가 옵니다.',
  '수': '지혜와 통찰의 한 해, 유연하게 흐름을 읽어보세요.',
};

export function generateYearFortune(targetYear: number): PlannerFortuneData {
  const yearElem = getYearElem(targetYear);
  const yearEmoji = ELEM_EMOJI[ELEM_KO.indexOf(yearElem)];

  const monthlyFortunes: MonthlyFortuneText[] = [];
  const monthScores: number[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthElem = MONTH_BRANCH_ELEM[m - 1];
    const relScore = elemRelScore(yearElem, monthElem);
    const raw = 50 + relScore;
    const score = Math.min(100, Math.max(0, raw));
    const grade = scoreToGrade(score);
    const relType = getRelType(relScore);
    const keywords = KEYWORDS_BY_REL[relType] ?? ['평온', '안정'];
    const mEmoji = ELEM_EMOJI[ELEM_KO.indexOf(monthElem)];
    const symbol = GRADE_SYMBOL[grade] ?? '○';

    monthScores.push(score);
    monthlyFortunes.push({
      month: m,
      grade,
      bannerText: `${yearEmoji} ${targetYear}년 · ${mEmoji} ${grade} · ${keywords.slice(0, 2).join(' · ')}`,
      keywords,
      yearIndexLabel: `${symbol} ${grade}`,
    });
  }

  const avgScore = Math.round(monthScores.reduce((s, v) => s + v, 0) / 12);
  const bestMonth = monthlyFortunes.reduce((a, b, i) =>
    monthScores[i] > monthScores[a.idx] ? { idx: i, f: b } : a,
    { idx: 0, f: monthlyFortunes[0] },
  );
  const worstMonth = monthlyFortunes.reduce((a, b, i) =>
    monthScores[i] < monthScores[a.idx] ? { idx: i, f: b } : a,
    { idx: 0, f: monthlyFortunes[0] },
  );

  const overallGrade = scoreToGrade(avgScore);

  return {
    type: 'zodiac',
    yearSummary: `${yearEmoji} ${targetYear}년 ${overallGrade} — ${bestMonth.f.month}월이 가장 좋고 ${worstMonth.f.month}월은 주의`,
    monthlyFortunes,
    dailyAffirmation: YEAR_AFFIRMATION[yearElem],
  };
}

// ── 메인 함수: 띠 운세 생성 ───────────────────────────────────────────────────

export function generateZodiacFortune(
  birthYear: number,
  targetYear: number,
): PlannerFortuneData {
  const animal = getAnimalByBirthYear(birthYear);
  const yearElem = getYearElem(targetYear);

  // 연간 기본 점수: 띠 오행 vs 연간 오행
  const yearBaseScore = elemRelScore(animal.elem, yearElem);
  const yearScore = Math.min(100, Math.max(0, 50 + yearBaseScore));

  // 12개월 운세 생성
  const monthlyFortunes: MonthlyFortuneText[] = [];
  const monthScores: number[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthElem = MONTH_BRANCH_ELEM[m - 1];
    const relScore = elemRelScore(animal.elem, monthElem);
    // 연간 오행 보너스: 월 오행이 연간 오행과 같으면 +8
    const yearBonus = monthElem === yearElem ? 8 : 0;
    const raw = 50 + relScore + yearBonus;
    const score = Math.min(100, Math.max(0, raw));
    const grade = scoreToGrade(score);
    const relType = getRelType(relScore);
    const keywords = KEYWORDS_BY_REL[relType] ?? ['평온', '안정'];
    const elemEmoji = ELEM_EMOJI[ELEM_KO.indexOf(monthElem)];
    const symbol = GRADE_SYMBOL[grade] ?? '○';

    monthScores.push(score);
    monthlyFortunes.push({
      month: m,
      grade,
      bannerText: `${animal.emoji} ${animal.animal}띠 · ${elemEmoji} ${grade} · ${keywords.slice(0, 2).join(' · ')}`,
      keywords,
      yearIndexLabel: `${symbol} ${grade}`,
    });
  }

  // 연간 총평
  const avgScore = Math.round(monthScores.reduce((s, v) => s + v, 0) / 12);
  const bestMonth = monthlyFortunes.reduce((a, b, i) =>
    monthScores[i] > monthScores[a.idx] ? { idx: i, f: b } : a,
    { idx: 0, f: monthlyFortunes[0] },
  );
  const worstMonth = monthlyFortunes.reduce((a, b, i) =>
    monthScores[i] < monthScores[a.idx] ? { idx: i, f: b } : a,
    { idx: 0, f: monthlyFortunes[0] },
  );

  const overallGrade = scoreToGrade(avgScore);
  const elemEmoji = ELEM_EMOJI[ELEM_KO.indexOf(animal.elem)];

  return {
    type: 'zodiac',
    yearSummary: `${animal.emoji} ${animal.animal}띠 ${elemEmoji} ${overallGrade} — ${bestMonth.f.month}월이 가장 좋고 ${worstMonth.f.month}월은 주의`,
    monthlyFortunes,
    dailyAffirmation: ZODIAC_AFFIRMATIONS[animal.elem],
  };
}
