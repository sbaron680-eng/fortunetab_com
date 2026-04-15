/**
 * Fortune Engine v2 — 통합 진입점
 *
 * BirthData → CompositeFortuneProfile
 *
 * 동양 사주명리 + 서양 점성술을 융합하여
 * 하나의 통합 프로필을 생성합니다.
 */

import type {
  BirthData,
  CompositeFortuneProfile,
  DaunPhase,
} from './types';
import { calculateSaju, calcAge } from './saju-core';
import {
  buildSipsinMap, detectSinsal, calcDaeun, findCurrentDaeun, getDaunPhase,
  analyzeBranchRelations, analyzeStemHap, analyzeTonggeun, analyzeSeun, analyzeGongmang,
} from './saju-advanced';
import { calcWesternProfile } from './western-astrology';
import { calcCompositeScore } from './composite-score';
import { calcBiorhythm } from '../biorhythm';

/**
 * 통합 Fortune Profile 계산
 *
 * 1. 사주 4주8자 계산 (Eastern)
 * 2. 십신/신살/대운 분석 (Eastern Advanced)
 * 3. Sun/Moon/Rising Sign 계산 (Western)
 * 4. 바이오리듬 + 대운 보너스 + 서양 보너스 → Fortune Score (Composite)
 *
 * @param birth 출생 데이터
 * @param targetDate 점수 계산 기준일 (기본: 오늘)
 */
export function calculateFortuneProfile(
  birth: BirthData,
  targetDate: Date = new Date(),
): CompositeFortuneProfile {
  const [year, month, day] = birth.date.split('-').map(Number);

  // ── 1. Eastern: 사주 ──
  const saju = calculateSaju(year, month, day, birth.hour);

  // ── 2. Eastern Advanced: 십신, 신살, 대운, 합충형파해 ──
  const sipsinMap = buildSipsinMap(saju);
  const sinsal = detectSinsal(saju);
  const daeunList = calcDaeun(saju, birth.gender, year, month, day);
  const branchRelations = analyzeBranchRelations(saju);
  const stemHap = analyzeStemHap(saju);
  const tonggeun = analyzeTonggeun(saju);
  const gongmang = analyzeGongmang(saju);

  const birthDate = new Date(year, month - 1, day);
  const age = calcAge(birthDate, targetDate);
  const currentDaeun = findCurrentDaeun(daeunList, age);
  const daunPhase: DaunPhase = getDaunPhase(currentDaeun.sipsin);

  // ── 3. Western: 점성술 ──
  const western = calcWesternProfile(birth);

  // ── 4. Composite: 통합 점수 ──
  const biorhythm = calcBiorhythm(birthDate, targetDate);
  const composite = calcCompositeScore(biorhythm, daunPhase, saju.dayElem, western);

  return {
    eastern: {
      saju,
      sipsinMap,
      sinsal,
      daeun: daeunList,
      currentDaeun,
      daunPhase,
      branchRelations,
      stemHap,
      tonggeun,
      gongmang,
    },
    western,
    composite: {
      bioScore: composite.bioScore,
      daunBonus: composite.daunBonus,
      westernBonus: composite.westernBonus,
      fortuneScore: composite.fortuneScore,
      fortunePercent: composite.fortunePercent,
      grade: composite.grade,
    },
  };
}

// ── Re-exports ─────────────────────────────────────────────────────────

export { calculateSaju, sajuSummary, elemCountToPercent, calcAge, calcDayMasterStrength, calcWeightedElemCount, getSeasonalStrength } from './saju-core';
export {
  buildSipsinMap, detectSinsal, calcDaeun, calcDaeunStartAge, getSipsin,
  analyzeBranchRelations, analyzeStemHap, analyzeTonggeun, analyzeSeun, analyzeGongmang,
} from './saju-advanced';
export { calcSunSign, calcMoonSign, calcRisingSign, calcWesternProfile } from './western-astrology';
export { calcCompositeScore, getGrade } from './composite-score';
export type * from './types';
