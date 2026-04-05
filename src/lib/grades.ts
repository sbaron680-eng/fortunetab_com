/**
 * 통합 등급 시스템
 *
 * Fortune Score (4등급)과 월별 운세 (5등급)을 통합하는 공유 유틸.
 * 각 시스템의 등급을 5단계 UnifiedGrade로 매핑하여 일관된 색상/스타일 제공.
 */

// ── 통합 등급 (5단계) ─────────────────────────────────────────────

export type UnifiedGrade = 'excellent' | 'good' | 'average' | 'caution' | 'rest';

export interface GradeStyle {
  grade: UnifiedGrade;
  label: string;
  emoji: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  strokeColor: string;
}

const GRADE_STYLES: Record<UnifiedGrade, GradeStyle> = {
  excellent: {
    grade: 'excellent',
    label: '대길',
    emoji: '◉',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
    strokeColor: '#059669',
  },
  good: {
    grade: 'good',
    label: '길',
    emoji: '●',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800',
    borderClass: 'border-blue-200',
    strokeColor: '#2563eb',
  },
  average: {
    grade: 'average',
    label: '평',
    emoji: '○',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
    strokeColor: '#6b7280',
  },
  caution: {
    grade: 'caution',
    label: '주의',
    emoji: '△',
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800',
    borderClass: 'border-amber-200',
    strokeColor: '#d97706',
  },
  rest: {
    grade: 'rest',
    label: '어려움',
    emoji: '▽',
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    strokeColor: '#dc2626',
  },
};

// ── 월별 운세 점수 → 통합 등급 (0~100 기반) ───────────────��──────

export function scoreToUnifiedGrade(score: number): GradeStyle {
  if (score >= 75) return GRADE_STYLES.excellent;
  if (score >= 60) return GRADE_STYLES.good;
  if (score >= 45) return GRADE_STYLES.average;
  if (score >= 30) return GRADE_STYLES.caution;
  return GRADE_STYLES.rest;
}

// ── Fortune Score → 통합 등급 (-1~1 기반) ────────────────────────

export type FortuneGradeKey = 'optimal' | 'good' | 'neutral' | 'rest';

const FORTUNE_TO_UNIFIED: Record<FortuneGradeKey, UnifiedGrade> = {
  optimal: 'excellent',
  good: 'good',
  neutral: 'average',
  rest: 'caution',
};

const FORTUNE_LABELS: Record<FortuneGradeKey, string> = {
  optimal: '발굴 최적',
  good: '좋은 흐름',
  neutral: '중립',
  rest: '충전',
};

export function fortuneGradeToUnified(gradeKey: FortuneGradeKey): GradeStyle {
  const unified = FORTUNE_TO_UNIFIED[gradeKey];
  return {
    ...GRADE_STYLES[unified],
    label: FORTUNE_LABELS[gradeKey],
  };
}

// ── Fortune Score 직접 → 통합 등급 ──────────────────────────────

export function fortuneScoreToGrade(fortuneScore: number): GradeStyle {
  let key: FortuneGradeKey;
  if (fortuneScore >= 0.40) key = 'optimal';
  else if (fortuneScore >= 0.10) key = 'good';
  else if (fortuneScore >= -0.15) key = 'neutral';
  else key = 'rest';
  return fortuneGradeToUnified(key);
}

// ── 통합 스타일 접근 ────────────────────────────────────────────

export function getGradeStyle(grade: UnifiedGrade): GradeStyle {
  return GRADE_STYLES[grade];
}

/** CSS 클래스 조합: "bg-emerald-100 text-emerald-800 border-emerald-200" */
export function gradeClasses(style: GradeStyle): string {
  return `${style.bgClass} ${style.textClass} ${style.borderClass}`;
}
