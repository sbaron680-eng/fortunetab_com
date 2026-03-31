/**
 * fortune-text.ts
 * 사주 분석 결과를 PDF 플래너에 삽입할 운세 텍스트로 변환합니다.
 * saju.ts의 결정적 운세 엔진을 래핑하여 PDF 렌더링용 포맷을 제공합니다.
 */

import type { SajuResult, FortuneMonth, ElemKo } from './saju';
import { getMonthlyFortune, ELEM_EMOJI, ELEM_KO } from './saju';

// ── 타입 정의 ──────────────────────────────────────────────────────────────

export interface PlannerFortuneData {
  type: 'personalized' | 'zodiac' | 'none';
  yearSummary: string;                    // 연간 총평 (커버/연간 인덱스용)
  monthlyFortunes: MonthlyFortuneText[];  // 12개월 운세
  dailyAffirmation: string;              // 일간 "오늘의 다짐" 대체
}

export interface MonthlyFortuneText {
  month: number;          // 1~12
  grade: string;          // '대길'|'길'|'평'|'주의'|'어려움'
  bannerText: string;     // 월간 배너용 짧은 문구 (한 줄)
  keywords: string[];     // 핵심 키워드 2~3개
  yearIndexLabel: string; // 연간 인덱스 셀용 (매우 짧은 텍스트)
}

// ── 등급 이모지 ─────────────────────────────────────────────────────────────

const GRADE_SYMBOL: Record<string, string> = {
  '대길': '◉',
  '길':   '●',
  '평':   '○',
  '주의': '△',
  '어려움': '▽',
};

// ── 오행별 일간 다짐 (결정적: 같은 사주 = 같은 문구) ────────────────────────

const DAILY_AFFIRMATIONS: Record<string, string[]> = {
  '목': [
    '새 가지를 뻗듯, 가능성을 향해 한 걸음 나아갑니다.',
    '뿌리 깊은 나무처럼 흔들림 없는 하루를 시작합니다.',
    '성장의 기운을 품고 오늘도 꾸준히 전진합니다.',
  ],
  '화': [
    '밝은 열정으로 오늘의 과제를 태워 성과로 바꿉니다.',
    '따뜻한 마음이 주위를 비추는 하루가 됩니다.',
    '불꽃 같은 의지로 목표에 집중합니다.',
  ],
  '토': [
    '단단한 대지 위에 차분한 하루를 쌓아갑니다.',
    '묵직한 신뢰로 관계를 다지는 하루입니다.',
    '균형과 안정의 힘으로 중심을 잡습니다.',
  ],
  '금': [
    '맑은 결단으로 불필요한 것을 덜어냅니다.',
    '날카로운 통찰로 핵심을 짚는 하루입니다.',
    '빛나는 마무리로 하루를 완성합니다.',
  ],
  '수': [
    '물처럼 유연하게 변화에 적응합니다.',
    '깊은 지혜로 흐름을 읽는 하루입니다.',
    '고요한 집중이 큰 성과를 이끕니다.',
  ],
};

function getDailyAffirmation(saju: SajuResult): string {
  const affirmations = DAILY_AFFIRMATIONS[saju.dayElem] ?? DAILY_AFFIRMATIONS['토'];
  // yongsin 인덱스로 결정적 선택
  const yongsinIdx = ELEM_KO.indexOf(saju.yongsin as ElemKo);
  const idx = ((yongsinIdx >= 0 ? yongsinIdx : 0) % affirmations.length);
  return affirmations[idx];
}

// ── 맞춤 운세 생성 (로그인 + 생년월일 사용자) ────────────────────────────────

export function generatePlannerFortune(
  saju: SajuResult,
  year: number,
): PlannerFortuneData {
  const monthlyRaw = getMonthlyFortune(saju, year);

  const monthlyFortunes = monthlyRaw.map((fm) => formatMonthlyFortune(fm));
  const yearSummary = buildYearSummary(monthlyRaw, saju);
  const dailyAffirmation = getDailyAffirmation(saju);

  return {
    type: 'personalized',
    yearSummary,
    monthlyFortunes,
    dailyAffirmation,
  };
}

// ── 월별 운세 포맷팅 ────────────────────────────────────────────────────────

function formatMonthlyFortune(fm: FortuneMonth): MonthlyFortuneText {
  const elemEmoji = ELEM_EMOJI[ELEM_KO.indexOf(fm.monthElem)];
  const symbol = GRADE_SYMBOL[fm.grade] ?? '○';
  const kwText = fm.keywords.slice(0, 3).join(' · ');

  return {
    month: fm.month,
    grade: fm.grade,
    bannerText: `${elemEmoji} ${fm.grade} · ${kwText}`,
    keywords: fm.keywords,
    yearIndexLabel: `${symbol} ${fm.grade}`,
  };
}

// ── 연간 총평 생성 ──────────────────────────────────────────────────────────

function buildYearSummary(months: FortuneMonth[], saju: SajuResult): string {
  const avgScore = Math.round(months.reduce((s, m) => s + m.score, 0) / 12);
  const bestMonth = months.reduce((a, b) => (a.score >= b.score ? a : b));
  const worstMonth = months.reduce((a, b) => (a.score <= b.score ? a : b));

  const overallGrade =
    avgScore >= 75 ? '대길'
    : avgScore >= 60 ? '길'
    : avgScore >= 45 ? '평'
    : '주의';

  const elemEmoji = ELEM_EMOJI[ELEM_KO.indexOf(saju.dayElem)];

  return `${elemEmoji} ${overallGrade} — ${bestMonth.month}월이 가장 좋고 ${worstMonth.month}월은 주의`;
}
