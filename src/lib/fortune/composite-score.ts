/**
 * Fortune Engine v2 — 통합 Fortune Score
 *
 * 바이오리듬(bioScore) + 대운 보너스(daunBonus) + 서양 보너스(westernBonus)
 * → fortuneScore (-1 ~ 1)
 */

import type {
  DaunPhase, FortuneGrade, FortuneGradeKey,
  WesternProfile, ElemKo,
} from './types';
import { DAUN_BONUS, WESTERN_TO_ELEM, ELEM_TO_WESTERN } from './constants';
import type { BiorhythmResult } from '../biorhythm';

// ─── 등급 테이블 ──────────────────────────────────────────────────────

const GRADE_TABLE: { min: number; grade: FortuneGrade }[] = [
  {
    min: 0.40,
    grade: {
      key: 'optimal',
      label: '발굴 최적',
      labelEn: 'Optimal',
      description: '지금이 가장 좋은 타이밍입니다',
      descriptionEn: 'This is the best timing for you',
    },
  },
  {
    min: 0.10,
    grade: {
      key: 'good',
      label: '좋은 흐름',
      labelEn: 'Good Flow',
      description: '흐름을 타고 시작하기 좋습니다',
      descriptionEn: 'Good time to ride the flow and start',
    },
  },
  {
    min: -0.15,
    grade: {
      key: 'neutral',
      label: '중립',
      labelEn: 'Neutral',
      description: '차분하게 준비하는 시기입니다',
      descriptionEn: 'A time for calm preparation',
    },
  },
  {
    min: -Infinity,
    grade: {
      key: 'rest',
      label: '충전',
      labelEn: 'Recharge',
      description: '에너지를 모으는 시기입니다',
      descriptionEn: 'A time to gather energy',
    },
  },
];

export function getGrade(score: number): FortuneGrade {
  for (const row of GRADE_TABLE) {
    if (score >= row.min) return row.grade;
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1].grade;
}

// ─── 서양 보너스 계산 ─────────────────────────────────────────────────

/**
 * 서양 점성술 기반 보너스 (-0.05 ~ +0.10)
 *
 * 현재 달의 별자리 원소와 일간 오행의 호환성에 기반
 * - 같은 원소 계열 → +0.10
 * - 상생 관계 → +0.05
 * - 무관 → 0
 * - 상극 → -0.05
 */
export function calcWesternBonus(
  dayElem: ElemKo,
  western: WesternProfile,
): number {
  // Sun Sign 원소와 일간 오행 비교
  const sunWesternElem = western.sunSign.element;
  const sunEasternElem = WESTERN_TO_ELEM[sunWesternElem];
  const dayWesternElem = ELEM_TO_WESTERN[dayElem];

  let bonus = 0;

  // Sun Sign 원소 호환성
  if (sunEasternElem === dayElem) {
    bonus += 0.05; // 같은 오행 계열
  } else if (dayWesternElem === sunWesternElem) {
    bonus += 0.03; // 같은 서양 원소
  }

  // Moon Sign 가산 (감성 영역)
  if (western.moonSign.element === dayWesternElem) {
    bonus += 0.03;
  }

  // Rising Sign 가산
  if (western.risingSign?.element === dayWesternElem) {
    bonus += 0.02;
  }

  return Math.min(0.10, Math.max(-0.05, bonus));
}

// ─── 통합 Fortune Score 계산 ──────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface CompositeScoreResult {
  bioScore: number;
  daunBonus: number;
  westernBonus: number;
  fortuneScore: number;
  fortunePercent: number;
  grade: FortuneGrade;
}

/**
 * 통합 Fortune Score 계산
 *
 * fortuneScore = clamp(bioScore + daunBonus + westernBonus, -1, 1)
 */
export function calcCompositeScore(
  biorhythm: BiorhythmResult,
  daunPhase: DaunPhase,
  dayElem: ElemKo,
  western: WesternProfile,
): CompositeScoreResult {
  const bioScore = biorhythm.bioScore;
  const daunBonus = DAUN_BONUS[daunPhase];
  const westernBonus = calcWesternBonus(dayElem, western);

  const raw = bioScore + daunBonus + westernBonus;
  const fortuneScore = Math.round(clamp(raw, -1, 1) * 10000) / 10000;
  const fortunePercent = Math.round(((fortuneScore + 1) / 2) * 100);

  return {
    bioScore,
    daunBonus,
    westernBonus,
    fortuneScore,
    fortunePercent,
    grade: getGrade(fortuneScore),
  };
}
