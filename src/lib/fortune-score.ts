/**
 * Fortune Score 통합 엔진
 *
 * 바이오리듬(bioScore) + 사주 대운(daunBonus) → fortuneScore
 * 범위: -1 ~ 1
 */

import { calcBiorhythm, type BiorhythmResult } from './biorhythm';
import { calculateSajuFromBirthData, calcDaeun, type DaeunPeriod, type SipsinName } from './saju';
import type { DaunPhase } from './supabase';

// ─── 십신 → 대운 단계 매핑 ────────────────────────────────────────────

const SIPSIN_TO_PHASE: Record<SipsinName, DaunPhase> = {
  '편재': '상승기',  // 재물·생산력 상승
  '정재': '상승기',
  '식신': '상승기',
  '정관': '안정기',  // 안정·학습
  '정인': '안정기',
  '편인': '안정기',
  '상관': '전환기',  // 변화·도전
  '편관': '전환기',
  '비견': '하강기',  // 경쟁·소모
  '겁재': '하강기',
};

// ─── 대운 단계별 보너스 ───────────────────────────────────────────────

const DAUN_BONUS: Record<DaunPhase, number> = {
  '상승기': +0.22,
  '안정기': +0.05,
  '전환기': -0.08,
  '하강기': -0.18,
};

// ─── 등급 ─────────────────────────────────────────────────────────────

export type FortuneGrade = 'optimal' | 'good' | 'neutral' | 'rest';

export interface FortuneGradeInfo {
  grade: FortuneGrade;
  label: string;
  description: string;
}

const GRADE_TABLE: { min: number; info: FortuneGradeInfo }[] = [
  { min:  0.40, info: { grade: 'optimal', label: '발굴 최적', description: '지금이 가장 좋은 타이밍입니다' } },
  { min:  0.10, info: { grade: 'good',    label: '좋은 흐름', description: '흐름을 타고 시작하기 좋습니다' } },
  { min: -0.15, info: { grade: 'neutral', label: '중립',      description: '차분하게 준비하는 시기입니다' } },
  { min: -Infinity, info: { grade: 'rest', label: '충전',     description: '에너지를 모으는 시기입니다' } },
];

function getGrade(score: number): FortuneGradeInfo {
  for (const row of GRADE_TABLE) {
    if (score >= row.min) return row.info;
  }
  return GRADE_TABLE[GRADE_TABLE.length - 1].info;
}

// ─── Fortune Score 결과 ───────────────────────────────────────────────

export interface FortuneScoreResult {
  biorhythm: BiorhythmResult;
  daunPhase: DaunPhase;
  daunBonus: number;
  daunSipsin: SipsinName;
  daunPeriod: DaeunPeriod;
  fortuneScore: number;   // -1 ~ 1
  fortunePercent: number; // 0 ~ 100
  grade: FortuneGradeInfo;
}

// ─── 나이 계산 (만 나이) ──────────────────────────────────────────────

function calcAge(birthDate: Date, targetDate: Date): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ─── 현재 대운 찾기 ──────────────────────────────────────────────────

function findCurrentDaeun(daeunList: DaeunPeriod[], age: number): DaeunPeriod {
  for (const period of daeunList) {
    if (age >= period.startAge && age <= period.endAge) {
      return period;
    }
  }
  // 대운 범위 밖 (3세 미만 또는 83세 초과) → 첫/마지막 대운 사용
  if (age < daeunList[0].startAge) return daeunList[0];
  return daeunList[daeunList.length - 1];
}

// ─── 메인 함수 ────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Fortune Score 계산
 * @param birthDate 생년월일 (YYYY-MM-DD 문자열 또는 Date)
 * @param birthTime 태어난 시 ('자시'~'해시' 또는 '모름')
 * @param gender 'male' | 'female'
 * @param targetDate 조회 대상일 (기본: 오늘)
 */
export function calcFortuneScore(
  birthDate: string | Date,
  birthTime: string,
  gender: string,
  targetDate: Date = new Date(),
): FortuneScoreResult {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  if (isNaN(birth.getTime())) throw new Error('Invalid birth_date format');

  // 1. 바이오리듬
  const biorhythm = calcBiorhythm(birth, targetDate);

  // 2. 사주 → 대운
  const yyyy = birth.getFullYear();
  const mm = String(birth.getMonth() + 1).padStart(2, '0');
  const dd = String(birth.getDate()).padStart(2, '0');
  const saju = calculateSajuFromBirthData(`${yyyy}-${mm}-${dd}`, birthTime);
  const daeunList = calcDaeun(saju, gender);

  // 3. 현재 나이의 대운 찾기
  const age = calcAge(birth, targetDate);
  const currentDaeun = findCurrentDaeun(daeunList, age);

  // 4. 십신 → 대운 단계 (매핑 누락 시 안정기 기본값)
  const daunPhase = SIPSIN_TO_PHASE[currentDaeun.sipsin] ?? '안정기';
  const bonus = DAUN_BONUS[daunPhase];

  // 5. Fortune Score = bioScore + daunBonus, clamped to [-1, 1]
  const raw = biorhythm.bioScore + bonus;
  const fortuneScore = Math.round(clamp(raw, -1, 1) * 10000) / 10000;
  const fortunePercent = Math.round(((fortuneScore + 1) / 2) * 100);

  return {
    biorhythm,
    daunPhase,
    daunBonus: bonus,
    daunSipsin: currentDaeun.sipsin,
    daunPeriod: currentDaeun,
    fortuneScore,
    fortunePercent,
    grade: getGrade(fortuneScore),
  };
}
