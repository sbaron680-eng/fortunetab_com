/**
 * Fortune Engine v2 — 사주 핵심 계산 (saju-core)
 *
 * 4주8자 계산의 순수 알고리즘만 담당.
 * 파생 분석(십신, 신살, 대운)은 saju-advanced.ts에서 처리.
 *
 * 개선사항 (v1 대비):
 * - 태양절기 테이블 적용 (기존 "2월 4일" 하드코딩 제거)
 * - 시간 입력을 숫자(0~23)로 통일 (기존 '자시'~'해시' 문자열 제거)
 * - null 반환 (기존 stemIdx=-1 센티널 제거)
 * - 임의 연도 월 오행 동적 생성
 */

import type { Pillar, SajuResult, ElemKo } from './types';
import {
  STEMS_KO, STEMS_HJ, STEMS_ELEM, STEMS_YIN,
  BRANCHES_KO, BRANCHES_HJ, BRANCHES_ELEM,
  ELEM_KO_LIST, GEN_CYCLE,
  MONTH_START_STEM, HOUR_START_STEM,
  getLichunDate, getMonthBranchByJeolgi,
  JIJANGAN_TABLE,
} from './constants';

// ─── Julian Day Number ────────────────────────────────────────────────

/**
 * 그레고리력 날짜 → Julian Day Number
 * 검증: JD(1900-01-01) = 2415021, JD(2000-01-01) = 2451545
 */
export function julianDayNumber(year: number, month: number, day: number): number {
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

// ─── Pillar 생성 ──────────────────────────────────────────────────────

export function makePillar(stemIdx: number, branchIdx: number): Pillar {
  return {
    stemIdx,
    branchIdx,
    stemKo: STEMS_KO[stemIdx],
    branchKo: BRANCHES_KO[branchIdx],
    stemHj: STEMS_HJ[stemIdx],
    branchHj: BRANCHES_HJ[branchIdx],
    stemElem: STEMS_ELEM[stemIdx] as ElemKo,
    branchElem: BRANCHES_ELEM[branchIdx] as ElemKo,
  };
}

// ─── 연주 (Year Pillar) ──────────────────────────────────────────────

/**
 * 연주 계산
 * 기준: 1924년 = 甲子年 (stem=0, branch=0)
 * 입춘 이전 출생자는 전년도 연주 사용
 */
export function calcYearPillar(year: number, month: number, day: number): Pillar {
  const lichun = getLichunDate(year);
  let y = year;
  if (month < lichun.month || (month === lichun.month && day < lichun.day)) {
    y -= 1;
  }
  const stemIdx = ((y - 1924) % 10 + 10) % 10;
  const branchIdx = ((y - 1924) % 12 + 12) % 12;
  return makePillar(stemIdx, branchIdx);
}

// ─── 월주 (Month Pillar) ─────────────────────────────────────────────

/**
 * 월주 계산
 * 12절기(節氣) 기반으로 월지 결정:
 *   소한→축, 입춘→인, 경칩→묘, 청명→진, 입하→사, 망종→오,
 *   소서→미, 입추→신, 백로→유, 한로→술, 입동→해, 대설→자
 * 월간: 연간 % 5에 따라 인월 시작 천간 결정
 */
export function calcMonthPillar(
  year: number,
  month: number,
  day: number,
  yearStemIdx: number,
): Pillar {
  const { branchIdx } = getMonthBranchByJeolgi(year, month, day);

  // 월간: 인월 시작 천간 + 지지 오프셋
  const startStem = MONTH_START_STEM[yearStemIdx % 5];
  const offset = (branchIdx - 2 + 12) % 12;
  const stemIdx = (startStem + offset) % 10;

  return makePillar(stemIdx, branchIdx);
}

// ─── 일주 (Day Pillar) ───────────────────────────────────────────────

/**
 * 일주 계산 — JDN 기반
 * 검증: 2000-01-01 → 戊午日, 1900-01-01 → 甲戌日
 */
export function calcDayPillar(year: number, month: number, day: number): Pillar {
  const jd = julianDayNumber(year, month, day);
  const stemIdx = ((jd + 9) % 10 + 10) % 10;
  const branchIdx = ((jd + 1) % 12 + 12) % 12;
  return makePillar(stemIdx, branchIdx);
}

// ─── 시주 (Hour Pillar) ──────────────────────────────────────────────

/**
 * 시간(0~23) → 지지 인덱스 변환
 * 자시(23~01)=0, 축시(01~03)=1, ..., 해시(21~23)=11
 */
export function hourToBranchIdx(hour: number): number {
  // 23시 이후는 자시(0)
  if (hour >= 23) return 0;
  return Math.floor((hour + 1) / 2);
}

/**
 * 시주 계산
 * @param hour 0~23 (undefined면 null 반환)
 * @param dayStemIdx 일간 인덱스
 */
export function calcHourPillar(hour: number | undefined, dayStemIdx: number): Pillar | null {
  if (hour === undefined) return null;
  const branchIdx = hourToBranchIdx(hour);
  const startStem = HOUR_START_STEM[dayStemIdx % 5];
  const stemIdx = (startStem + branchIdx) % 10;
  return makePillar(stemIdx, branchIdx);
}

// ─── 오행 분포 ────────────────────────────────────────────────────────

export function calcElemCount(pillars: (Pillar | null)[]): Record<ElemKo, number> {
  const count: Record<ElemKo, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    if (!p) continue;
    count[p.stemElem]++;
    count[p.branchElem]++;
  }
  return count;
}

// ─── 지장간 포함 오행 집계 (Weighted Element Count) ──────────────────

/**
 * 지장간 가중치를 포함한 오행 집계.
 *
 * 표면 오행(천간=1.0, 지지 본원소=0.0) + 지장간(정기 0.6, 중기 0.3, 여기 0.1)
 * → 오행별 실효 강도를 소수점으로 산출.
 *
 * 신강/신약 판별의 정밀도를 높이기 위해 사용.
 */
export function calcWeightedElemCount(pillars: (Pillar | null)[]): Record<ElemKo, number> {
  const count: Record<ElemKo, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 지장간 가중치: [stemIdx, weight] 쌍으로 순회
  const JIJANGAN_WEIGHTS: [keyof typeof JIJANGAN_TABLE[number], number][] = [
    ['jeonggi', 0.6],
    ['junggi', 0.3],
    ['yeogi', 0.1],
  ];

  for (const p of pillars) {
    if (!p) continue;
    count[p.stemElem] += 1.0;
    const jj = JIJANGAN_TABLE[p.branchIdx];
    for (const [key, weight] of JIJANGAN_WEIGHTS) {
      const stemIdx = jj[key];
      if (stemIdx !== null) {
        count[STEMS_ELEM[stemIdx] as ElemKo] += weight;
      }
    }
  }
  for (const elem of ELEM_KO_LIST) {
    count[elem] = Math.round(count[elem] * 10000) / 10000;
  }
  return count;
}

// ─── 신강/신약 판별 (Day Master Strength) ────────────────────────────

// ─── 왕상휴수사(旺相休囚死) 계절 강도 ───────────────────────────────

// 월지 → 왕(旺)한 오행
const SEASON_WANG: Record<number, ElemKo> = {
  2: '목', 3: '목',  // 인, 묘
  5: '화', 6: '화',  // 사, 오
  8: '금', 9: '금',  // 신, 유
  0: '수', 11: '수', // 자, 해
  4: '토', 7: '토', 10: '토', 1: '토',
};

// 왕상휴수사 계수: diff(상생순 거리) → 강도
// diff 0=왕(旺), 1=상(相), 2=사(死), 3=수(囚), 4=휴(休)
const WANG_SANG_STRENGTH = [1.0, 0.8, 0.2, 0.4, 0.6] as const;

/**
 * 왕상휴수사(旺相休囚死) 5단계 계절 강도 계수
 *
 * 왕(旺)=1.0: 계절과 같은 오행
 * 상(相)=0.8: 계절이 생하는 오행
 * 휴(休)=0.6: 계절을 생한 오행 (모 오행)
 * 수(囚)=0.4: 계절을 극하는 오행
 * 사(死)=0.2: 계절이 극하는 오행
 */
export function getSeasonalStrength(elem: ElemKo, monthBranchIdx: number): number {
  const wangElem = SEASON_WANG[monthBranchIdx];
  const wangIdx = GEN_CYCLE.indexOf(wangElem);
  const elemIdx = GEN_CYCLE.indexOf(elem);
  const diff = (elemIdx - wangIdx + 5) % 5;
  return WANG_SANG_STRENGTH[diff];
}

/**
 * 일간(Day Master)의 강약 판별 (정밀 억부법)
 *
 * 종합 점수 = (비겁+인성 가중치 합) × 계절강도 vs (식상+재성+관성 가중치 합) × 계절강도
 * 지장간 가중치 포함, 왕상휴수사 5단계 계절 계수 적용.
 *
 * @returns 'strong' | 'weak'
 */
export function calcDayMasterStrength(
  dayElem: ElemKo,
  monthBranchIdx: number,
  elemCount: Record<ElemKo, number>,
): 'strong' | 'weak' {
  const dayIdx = GEN_CYCLE.indexOf(dayElem);
  const seasonCoeff = getSeasonalStrength(dayElem, monthBranchIdx);

  const inElem = GEN_CYCLE[(dayIdx - 1 + 5) % 5]; // 인성 (나를 생하는)
  const sikElem = GEN_CYCLE[(dayIdx + 1) % 5];     // 식상 (내가 생하는)
  const jaeElem = GEN_CYCLE[(dayIdx + 2) % 5];     // 재성 (내가 극하는)
  const gwanElem = GEN_CYCLE[(dayIdx + 3) % 5];    // 관성 (나를 극하는)

  // 도움 세력 (비겁 + 인성) × 계절 계수
  const supportScore =
    ((elemCount[dayElem] ?? 0) + (elemCount[inElem] ?? 0)) * seasonCoeff;

  // 억제 세력 (식상 + 재성 + 관성) — 각 오행에 개별 계절 계수 적용
  const suppressScore =
    ((elemCount[sikElem] ?? 0) * getSeasonalStrength(sikElem, monthBranchIdx)) +
    ((elemCount[jaeElem] ?? 0) * getSeasonalStrength(jaeElem, monthBranchIdx)) +
    ((elemCount[gwanElem] ?? 0) * getSeasonalStrength(gwanElem, monthBranchIdx));

  return supportScore >= suppressScore ? 'strong' : 'weak';
}

// ─── 용신 (Yongsin) ──────────────────────────────────────────────────

/**
 * 용신 계산 — 억부법(抑扶法) 기반
 *
 * 신강(강한 일간): 설기(食傷, 내가 생하는)·극기(財星, 내가 극하는)하는 오행이 용신
 * 신약(약한 일간): 생조(印星, 나를 생하는)·비화(比劫, 같은 오행)하는 오행이 용신
 *
 * @param elemCount 오행 분포
 * @param dayElem 일간 오행
 * @param monthBranchIdx 월지 인덱스 (신강/신약 판별용)
 */
export function calcYongsin(
  elemCount: Record<ElemKo, number>,
  dayElem?: ElemKo,
  monthBranchIdx?: number,
): ElemKo {
  // 하위 호환: dayElem, monthBranchIdx 미제공 시 기존 로직
  if (dayElem === undefined || monthBranchIdx === undefined) {
    let minElem: ElemKo = '목';
    let minCount = Infinity;
    for (const elem of ELEM_KO_LIST) {
      if (elemCount[elem] < minCount) {
        minCount = elemCount[elem];
        minElem = elem;
      }
    }
    const minIdx = GEN_CYCLE.indexOf(minElem);
    return GEN_CYCLE[(minIdx - 1 + 5) % 5];
  }

  const strength = calcDayMasterStrength(dayElem, monthBranchIdx, elemCount);
  const dayIdx = GEN_CYCLE.indexOf(dayElem);

  if (strength === 'strong') {
    // 신강: 설기(식상)와 극기(재성) 중 더 약한 쪽
    const sikElem = GEN_CYCLE[(dayIdx + 1) % 5]; // 식상 (내가 생하는)
    const jaeElem = GEN_CYCLE[(dayIdx + 2) % 5]; // 재성 (내가 극하는)
    return elemCount[sikElem] <= elemCount[jaeElem] ? sikElem : jaeElem;
  } else {
    // 신약: 인성과 비겁 중 더 약한 쪽
    const inElem = GEN_CYCLE[(dayIdx - 1 + 5) % 5]; // 인성 (나를 생하는)
    const biElem = dayElem; // 비겁 (같은 오행)
    return elemCount[inElem] <= elemCount[biElem] ? inElem : biElem;
  }
}

// ─── 메인 사주 계산 ──────────────────────────────────────────────────

/**
 * 사주팔자 계산
 * @param birthYear  양력 출생 년
 * @param birthMonth 양력 출생 월 (1~12)
 * @param birthDay   양력 출생 일
 * @param birthHour  출생 시간 (0~23, undefined=모름)
 */
export function calculateSaju(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  birthHour?: number,
): SajuResult {
  const yearPillar = calcYearPillar(birthYear, birthMonth, birthDay);
  const monthPillar = calcMonthPillar(birthYear, birthMonth, birthDay, yearPillar.stemIdx);
  const dayPillar = calcDayPillar(birthYear, birthMonth, birthDay);
  const hourPillar = calcHourPillar(birthHour, dayPillar.stemIdx);

  const activePillars = [yearPillar, monthPillar, dayPillar, hourPillar];
  const elemCount = calcElemCount(activePillars);
  const weightedElemCount = calcWeightedElemCount(activePillars);
  const dayElem = dayPillar.stemElem;
  // 용신 판별은 지장간 가중치 포함 오행으로 정밀 계산
  const yongsin = calcYongsin(weightedElemCount, dayElem, monthPillar.branchIdx);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    elemCount,
    dayElem,
    yongsin,
  };
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────

/** 사주 결과를 요약 텍스트로 변환 */
export function sajuSummary(saju: SajuResult, locale: 'ko' | 'en' = 'ko'): string {
  const fmt = (p: Pillar) => `${p.stemKo}${p.branchKo}(${p.stemHj}${p.branchHj})`;
  const hourStr = saju.hour ? fmt(saju.hour) : (locale === 'ko' ? '시간미상' : 'Unknown');
  if (locale === 'ko') {
    return `${fmt(saju.year)}년 ${fmt(saju.month)}월 ${fmt(saju.day)}일 ${hourStr}시`;
  }
  return `Year: ${fmt(saju.year)}, Month: ${fmt(saju.month)}, Day: ${fmt(saju.day)}, Hour: ${hourStr}`;
}

/** 오행 분포를 퍼센트로 변환 */
export function elemCountToPercent(elemCount: Record<ElemKo, number>, hasHour: boolean): Record<ElemKo, number> {
  const total = hasHour ? 8 : 6;
  const result = {} as Record<ElemKo, number>;
  for (const elem of ELEM_KO_LIST) {
    result[elem] = Math.round((elemCount[elem] / total) * 100);
  }
  return result;
}

/** 오행 관계 점수 (일간 vs 대상 오행) */
export function elemRelScore(myElem: ElemKo, targetElem: ElemKo): number {
  const myIdx = GEN_CYCLE.indexOf(myElem);
  const targetIdx = GEN_CYCLE.indexOf(targetElem);
  const diff = (targetIdx - myIdx + 5) % 5;

  if (diff === 4) return 25;  // 인성 (나를 생해주는)
  if (diff === 1) return 15;  // 식상 (내가 생하는)
  if (diff === 0) return 5;   // 비겁 (같은 오행)
  if (diff === 2) return 10;  // 재성 (내가 극하는)
  return -20;                 // 관성 (나를 극하는)
}

/** 만 나이 계산 */
export function calcAge(birthDate: Date, targetDate: Date = new Date()): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
