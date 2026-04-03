/**
 * 바이오리듬 엔진
 *
 * 4사이클: 신체(23일), 감성(28일), 지성(33일), 직관(38일)
 * bioScore = Σ(cycleValue × weight), 범위 -1 ~ 1
 */

// ─── 사이클 정의 ──────────────────────────────────────────────────────

export interface BiorhythmCycle {
  name: string;
  nameEn: string;
  period: number;
  weight: number;
}

export const CYCLES: readonly BiorhythmCycle[] = [
  { name: '신체', nameEn: 'physical',    period: 23, weight: 0.30 },
  { name: '감성', nameEn: 'emotional',   period: 28, weight: 0.30 },
  { name: '지성', nameEn: 'intellectual', period: 33, weight: 0.20 },
  { name: '직관', nameEn: 'intuitive',   period: 38, weight: 0.20 },
] as const;

// ─── 타입 ─────────────────────────────────────────────────────────────

export interface CycleValue {
  name: string;
  nameEn: string;
  period: number;
  raw: number;     // -1 ~ 1 (sin 값)
  percent: number; // 0 ~ 100
}

export interface BiorhythmResult {
  cycles: CycleValue[];
  bioScore: number;      // 가중합, -1 ~ 1
  bioPercent: number;    // 0 ~ 100
  elapsedDays: number;
}

// ─── 핵심 계산 ────────────────────────────────────────────────────────

/** 두 날짜 사이의 일수 차이 (UTC 기준, 소수점 없이) */
function daysBetween(birthDate: Date, targetDate: Date): number {
  const MS_PER_DAY = 86_400_000;
  const utcBirth = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const utcTarget = Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  return Math.floor((utcTarget - utcBirth) / MS_PER_DAY);
}

/** sin 값을 0~100 퍼센트로 변환 */
function toPercent(sinValue: number): number {
  return Math.round(((sinValue + 1) / 2) * 100);
}

/**
 * 바이오리듬 계산
 * @param birthDate 생년월일
 * @param targetDate 조회 대상일 (기본: 오늘)
 */
export function calcBiorhythm(birthDate: Date, targetDate: Date = new Date()): BiorhythmResult {
  const elapsed = daysBetween(birthDate, targetDate);

  const cycles: CycleValue[] = CYCLES.map((c) => {
    const raw = Math.sin((2 * Math.PI * elapsed) / c.period);
    return {
      name: c.name,
      nameEn: c.nameEn,
      period: c.period,
      raw: Math.round(raw * 10000) / 10000, // 소수 4자리
      percent: toPercent(raw),
    };
  });

  // 가중합
  let bioScore = 0;
  for (let i = 0; i < CYCLES.length; i++) {
    bioScore += cycles[i].raw * CYCLES[i].weight;
  }
  bioScore = Math.round(bioScore * 10000) / 10000;

  return {
    cycles,
    bioScore,
    bioPercent: toPercent(bioScore),
    elapsedDays: elapsed,
  };
}

// ─── 주간 추세 (7일) ──────────────────────────────────────────────────

export interface WeekTrend {
  date: Date;
  bioScore: number;
  bioPercent: number;
}

/**
 * 대상일 기준 -3일 ~ +3일 (7일) 바이오리듬 추세
 */
export function calcWeekTrend(birthDate: Date, centerDate: Date = new Date()): WeekTrend[] {
  const trend: WeekTrend[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + offset);
    const result = calcBiorhythm(birthDate, d);
    trend.push({
      date: d,
      bioScore: result.bioScore,
      bioPercent: result.bioPercent,
    });
  }
  return trend;
}
