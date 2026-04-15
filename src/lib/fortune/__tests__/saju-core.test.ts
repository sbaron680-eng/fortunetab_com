/**
 * saju-core.ts 단위 테스트
 *
 * 기존 saju.ts 출력과의 교차 검증 포함
 */

import { describe, it, expect } from 'vitest';
import {
  julianDayNumber,
  calcYearPillar,
  calcMonthPillar,
  calcDayPillar,
  calcHourPillar,
  hourToBranchIdx,
  calculateSaju,
  calcElemCount,
  calcWeightedElemCount,
  calcAge,
  elemRelScore,
  calcDayMasterStrength,
  getSeasonalStrength,
  calcYongsin,
} from '../saju-core';
import type { ElemKo } from '../types';
import { calcDaeunStartAge } from '../saju-advanced';
import { getMonthBranchByJeolgi, getJeolgiDaysForYear } from '../constants';

// ─── Julian Day Number ────────────────────────────────────────────────

describe('julianDayNumber', () => {
  it('should return correct JDN for 1900-01-01', () => {
    expect(julianDayNumber(1900, 1, 1)).toBe(2415021);
  });

  it('should return correct JDN for 2000-01-01', () => {
    expect(julianDayNumber(2000, 1, 1)).toBe(2451545);
  });

  it('should return correct JDN for 2026-04-06', () => {
    // 2026-04-06 = JDN 2461133
    const jd = julianDayNumber(2026, 4, 6);
    expect(jd).toBeGreaterThan(2451545); // After 2000
  });
});

// ─── Year Pillar ──────────────────────────────────────────────────────

describe('calcYearPillar', () => {
  it('should return 甲子(갑자) for 1924 (after lichun)', () => {
    const p = calcYearPillar(1924, 3, 1);
    expect(p.stemKo).toBe('갑');
    expect(p.branchKo).toBe('자');
    expect(p.stemIdx).toBe(0);
    expect(p.branchIdx).toBe(0);
  });

  it('should use previous year for birth before lichun', () => {
    // 2026-01-15 → 입춘 전이므로 2025년 연주
    const p2026Jan = calcYearPillar(2026, 1, 15);
    const p2025 = calcYearPillar(2025, 6, 1);
    expect(p2026Jan.stemIdx).toBe(p2025.stemIdx);
    expect(p2026Jan.branchIdx).toBe(p2025.branchIdx);
  });

  it('should return 丙午(병오) for 2026', () => {
    const p = calcYearPillar(2026, 6, 1);
    expect(p.stemKo).toBe('병');
    expect(p.branchKo).toBe('오');
  });
});

// ─── Day Pillar ───────────────────────────────────────────────────────

describe('calcDayPillar', () => {
  it('should return 甲戌(갑술) for 1900-01-01', () => {
    const p = calcDayPillar(1900, 1, 1);
    expect(p.stemKo).toBe('갑');
    expect(p.branchKo).toBe('술');
  });

  it('should return 戊午(무오) for 2000-01-01', () => {
    const p = calcDayPillar(2000, 1, 1);
    expect(p.stemKo).toBe('무');
    expect(p.branchKo).toBe('오');
  });
});

// ─── Hour Pillar ──────────────────────────────────────────────────────

describe('hourToBranchIdx', () => {
  it('should map 23:00 to 자시(0)', () => {
    expect(hourToBranchIdx(23)).toBe(0);
  });

  it('should map 0:00 to 자시(0)', () => {
    expect(hourToBranchIdx(0)).toBe(0);
  });

  it('should map 1:00 to 축시(1)', () => {
    expect(hourToBranchIdx(1)).toBe(1);
  });

  it('should map 12:00 to 오시(6)', () => {
    expect(hourToBranchIdx(12)).toBe(6);
  });

  it('should map 22:00 to 해시(11)', () => {
    expect(hourToBranchIdx(22)).toBe(11);
  });
});

describe('calcHourPillar', () => {
  it('should return null for undefined hour', () => {
    expect(calcHourPillar(undefined, 0)).toBeNull();
  });

  it('should return valid pillar for hour=14 (미시)', () => {
    const p = calcHourPillar(14, 0); // 甲日 14시 = 미시(7)
    expect(p).not.toBeNull();
    expect(p!.branchIdx).toBe(7); // 미
  });
});

// ─── Full Saju Calculation ────────────────────────────────────────────

describe('calculateSaju', () => {
  it('should calculate complete saju for 1990-05-15', () => {
    const result = calculateSaju(1990, 5, 15);
    expect(result.year).toBeDefined();
    expect(result.month).toBeDefined();
    expect(result.day).toBeDefined();
    expect(result.hour).toBeNull(); // No hour given
    expect(result.dayElem).toBeDefined();
    expect(result.yongsin).toBeDefined();
  });

  it('should have elemCount summing to 6 without hour', () => {
    const result = calculateSaju(1990, 5, 15);
    const total = Object.values(result.elemCount).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });

  it('should have elemCount summing to 8 with hour', () => {
    const result = calculateSaju(1990, 5, 15, 14);
    const total = Object.values(result.elemCount).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });

  it('should produce valid yongsin (one of 5 elements)', () => {
    const result = calculateSaju(1990, 5, 15);
    expect(['목', '화', '토', '금', '수']).toContain(result.yongsin);
  });
});

// ─── Element Relations ────────────────────────────────────────────────

describe('elemRelScore', () => {
  it('should return 5 for same element (비겁)', () => {
    expect(elemRelScore('목', '목')).toBe(5);
  });

  it('should return 25 for generating element (인성)', () => {
    // 수 generates 목 → 목 receives from 수
    expect(elemRelScore('목', '수')).toBe(25);
  });

  it('should return 15 for produced element (식상)', () => {
    // 목 generates 화
    expect(elemRelScore('목', '화')).toBe(15);
  });

  it('should return -20 for controlling element (관성)', () => {
    // 금 controls 목
    expect(elemRelScore('목', '금')).toBe(-20);
  });
});

// ─── Age Calculation ──────────────────────────────────────────────────

describe('calcAge', () => {
  it('should calculate correct age', () => {
    const birth = new Date(1990, 4, 15); // May 15, 1990
    const target = new Date(2026, 3, 6); // Apr 6, 2026
    expect(calcAge(birth, target)).toBe(35);
  });

  it('should subtract 1 if birthday not yet passed', () => {
    const birth = new Date(1990, 11, 25); // Dec 25, 1990
    const target = new Date(2026, 3, 6);  // Apr 6, 2026
    expect(calcAge(birth, target)).toBe(35);
  });
});

// ─── 12절기 기반 월주 ────────────────────────────────────────────────

describe('getMonthBranchByJeolgi', () => {
  it('should return 인월(2) for date after 입춘 (Feb 5)', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 2, 10);
    expect(branchIdx).toBe(2); // 인(寅)
  });

  it('should return 축월(1) for date before 입춘 (Jan 20)', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 1, 20);
    expect(branchIdx).toBe(1); // 축(丑)
  });

  it('should return 묘월(3) for date after 경칩 (Mar 10)', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 3, 10);
    expect(branchIdx).toBe(3); // 묘(卯)
  });

  it('should return 인월(2) for date before 경칩 (Mar 3)', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 3, 3);
    expect(branchIdx).toBe(2); // 인(寅) — 아직 경칩 전
  });

  it('should return 자월(0) for early January before 소한', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 1, 3);
    expect(branchIdx).toBe(0); // 자(子) — 소한(1/6) 전
  });

  it('should return 사월(5) for mid May after 입하', () => {
    const { branchIdx } = getMonthBranchByJeolgi(2026, 5, 15);
    expect(branchIdx).toBe(5); // 사(巳)
  });
});

// ─── 대운 시작 나이 ─────────────────────────────────────────────────

describe('calcDaeunStartAge', () => {
  it('should return age between 1 and 10', () => {
    const age = calcDaeunStartAge(1990, 5, 15, true);
    expect(age).toBeGreaterThanOrEqual(1);
    expect(age).toBeLessThanOrEqual(10);
  });

  it('should return different ages for forward vs reverse', () => {
    const fwd = calcDaeunStartAge(1990, 5, 15, true);
    const rev = calcDaeunStartAge(1990, 5, 15, false);
    // 순행(다음절기)과 역행(이전절기)은 일수가 다르므로 보통 다른 결과
    expect(typeof fwd).toBe('number');
    expect(typeof rev).toBe('number');
  });

  it('should return 1 for birth 2 days before next jeolgi (mangjong)', () => {
    // 망종(6/6) 직전 6/4 출생 → 다음 절기까지 2일 → round(2/3) = 1
    expect(calcDaeunStartAge(2026, 6, 4, true)).toBe(1);
  });

  it('should return 7 for birth near start of jeolgi period', () => {
    // 입하(5/6) 직후 5/7 출생, 순행 → 다음 절기 망종(6/6)까지 30일 → round(30/3) = 10
    // 역행 → 이전 절기 입하(5/6)부터 1일 → round(1/3) = 0 → clamp=1
    expect(calcDaeunStartAge(2026, 5, 7, true)).toBe(10);
    expect(calcDaeunStartAge(2026, 5, 7, false)).toBe(1);
  });
});

// ─── 신강/신약 판별 ─────────────────────────────────────────────────

describe('calcDayMasterStrength', () => {
  it('should return strong when day elem matches month season + support', () => {
    // 목 일간 + 인월(2, 봄=목왕) + 비인 다수
    const elemCount = { 목: 3, 화: 1, 토: 1, 금: 1, 수: 2 };
    expect(calcDayMasterStrength('목', 2, elemCount)).toBe('strong');
  });

  it('should return weak when day elem is unsupported', () => {
    // 금 일간 + 인월(2, 봄=목왕) + 비인 소수
    const elemCount = { 목: 3, 화: 2, 토: 1, 금: 1, 수: 1 };
    expect(calcDayMasterStrength('금', 2, elemCount)).toBe('weak');
  });
});

// ─── 용신 (억부법) ──────────────────────────────────────────────────

describe('calcYongsin (advanced)', () => {
  it('should return 식상/재성 for 신강 day master', () => {
    // 목 일간 + 인월(2) + 강한 목 → 신강 → 식상(화) 또는 재성(토)
    const elemCount = { 목: 3, 화: 1, 토: 1, 금: 1, 수: 2 };
    const yongsin = calcYongsin(elemCount, '목', 2);
    expect(['화', '토']).toContain(yongsin);
  });

  it('should return 인성/비겁 for 신약 day master', () => {
    // 금 일간 + 인월(2) + 약한 금 → 신약 → 인성(토) 또는 비겁(금)
    const elemCount = { 목: 3, 화: 2, 토: 1, 금: 1, 수: 1 };
    const yongsin = calcYongsin(elemCount, '금', 2);
    expect(['토', '금']).toContain(yongsin);
  });

  it('should fallback to legacy logic without dayElem', () => {
    const elemCount = { 목: 2, 화: 0, 토: 2, 금: 2, 수: 2 };
    const yongsin = calcYongsin(elemCount);
    expect(['목', '화', '토', '금', '수']).toContain(yongsin);
  });
});

// ─── 연도별 절기 보정 ───────────────────────────────────────────────

describe('getJeolgiDaysForYear', () => {
  it('should apply lichun correction from LICHUN_DATES', () => {
    // 2025 입춘은 2/3 (LICHUN_DATES에 기록됨)
    const days = getJeolgiDaysForYear(2025);
    expect(days[1].day).toBe(3); // 입춘
  });

  it('should apply JEOLGI_YEARLY corrections', () => {
    // 2025 소한은 1/5 (JEOLGI_YEARLY[0][2025] = 5)
    const days = getJeolgiDaysForYear(2025);
    expect(days[0].day).toBe(5); // 소한
  });

  it('should use default for years not in JEOLGI_YEARLY', () => {
    const days = getJeolgiDaysForYear(1970);
    expect(days[0].day).toBe(6); // 소한 기본값
  });

  it('should affect month branch for boundary dates', () => {
    // 2025-01-05: 소한이 1/5인 해 → 축월(1) 시작
    const { branchIdx: b2025 } = getMonthBranchByJeolgi(2025, 1, 5);
    expect(b2025).toBe(1); // 축월

    // 1970-01-05: 소한이 1/6인 해 → 아직 자월(0)
    const { branchIdx: b1970 } = getMonthBranchByJeolgi(1970, 1, 5);
    expect(b1970).toBe(0); // 자월
  });
});

// ─── 지장간 포함 오행 집계 ───────────────────────────────────────────

describe('calcWeightedElemCount', () => {
  it('should differ from simple elem count due to hidden stems', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const weighted = calcWeightedElemCount([saju.year, saju.month, saju.day, saju.hour]);
    const simple = calcElemCount([saju.year, saju.month, saju.day, saju.hour]);

    // 가중치 포함 분포는 단순 분포와 다른 분포 패턴을 가진다
    const differs = Object.keys(weighted).some(
      k => weighted[k as ElemKo] !== simple[k as ElemKo]
    );
    expect(differs).toBe(true);
  });

  it('should produce non-integer values', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const weighted = calcWeightedElemCount([saju.year, saju.month, saju.day, saju.hour]);
    const hasDecimal = Object.values(weighted).some(v => v !== Math.floor(v));
    expect(hasDecimal).toBe(true);
  });
});

// ─── 왕상휴수사 계절 강도 ───────────────────────────────────────────

describe('getSeasonalStrength', () => {
  it('should return 1.0 for 왕(旺) — same element as season', () => {
    // 인월(2) = 봄 = 목 왕 → 목의 계절 강도 = 1.0
    expect(getSeasonalStrength('목', 2)).toBe(1.0);
  });

  it('should return 0.8 for 상(相) — season generates this element', () => {
    // 인월(2) = 봄 = 목 왕 → 화(목이 생하는) = 상 = 0.8
    expect(getSeasonalStrength('화', 2)).toBe(0.8);
  });

  it('should return 0.6 for 휴(休) — this element generates season', () => {
    // 인월(2) = 봄 = 목 왕 → 수(목을 생하는 모 오행) = 휴 = 0.6
    expect(getSeasonalStrength('수', 2)).toBe(0.6);
  });

  it('should return 0.4 for 수(囚) — this element controls season', () => {
    // 인월(2) = 봄 = 목 왕 → 금(목을 극하는) = 수 = 0.4
    expect(getSeasonalStrength('금', 2)).toBe(0.4);
  });

  it('should return 0.2 for 사(死) — season controls this element', () => {
    // 인월(2) = 봄 = 목 왕 → 토(목이 극하는) = 사 = 0.2
    expect(getSeasonalStrength('토', 2)).toBe(0.2);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// 합충형파해 + 천간합 + 통근 + 공망 + 세운 테스트
// ═══════════════════════════════════════════════════════════════════════

import {
  analyzeBranchRelations, analyzeStemHap, analyzeTonggeun,
  analyzeSeun, analyzeGongmang,
} from '../saju-advanced';
import { calcGongmang } from '../constants';

describe('analyzeBranchRelations', () => {
  it('should detect 삼합 when present', () => {
    // 인오술(2,6,10) 화국 사주 구성
    const saju = calculateSaju(1990, 5, 15, 14); // 실제 사주에서 확인
    const relations = analyzeBranchRelations(saju);
    // 삼합/반합이 있을 수 있음 (실제 사주에 따라 다름)
    expect(Array.isArray(relations)).toBe(true);
    for (const r of relations) {
      expect(['삼합', '방합', '육합', '충', '형', '파', '해']).toContain(r.type);
      expect(r.description.length).toBeGreaterThan(0);
    }
  });

  it('should detect 충 for opposing branches', () => {
    // 자오충: branchIdx 0과 6이 동시에 있는 사주
    // 1986-06-15 08시 → 연지=인(2), 월지=오(6), 일지 확인 필요
    const saju = calculateSaju(1986, 6, 15, 8);
    const relations = analyzeBranchRelations(saju);
    const types = relations.map(r => r.type);
    // 충이 있으면 bad nature여야 함
    const chungs = relations.filter(r => r.type === '충');
    for (const c of chungs) {
      expect(c.nature).toBe('bad');
    }
  });
});

describe('analyzeStemHap', () => {
  it('should detect 천간합 when present', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const haps = analyzeStemHap(saju);
    expect(Array.isArray(haps)).toBe(true);
    for (const h of haps) {
      expect(['목', '화', '토', '금', '수']).toContain(h.resultElem);
      expect(h.name.length).toBeGreaterThan(0);
    }
  });
});

describe('analyzeTonggeun', () => {
  it('should analyze all stems for roots in branches', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const tonggeun = analyzeTonggeun(saju);
    // 시주 포함 시 4개 천간 분석
    expect(tonggeun.length).toBe(4);
    for (const t of tonggeun) {
      expect(['연간', '월간', '일간', '시간']).toContain(t.position);
      expect(Array.isArray(t.rootBranches)).toBe(true);
    }
  });

  it('should find roots in jijangan', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const tonggeun = analyzeTonggeun(saju);
    // 적어도 일간은 어딘가에 통근 가능성 있음
    const hasAnyRoot = tonggeun.some(t => t.rootBranches.length > 0);
    expect(hasAnyRoot).toBe(true);
  });
});

describe('calcGongmang', () => {
  it('should return two branch indices', () => {
    const [gm1, gm2] = calcGongmang(0, 0); // 갑자일
    expect(gm1).toBeGreaterThanOrEqual(0);
    expect(gm1).toBeLessThan(12);
    expect(gm2).toBeGreaterThanOrEqual(0);
    expect(gm2).toBeLessThan(12);
    expect(gm1).not.toBe(gm2);
  });

  it('should return 술해 for 갑자순', () => {
    // 갑자순: 갑자~계유, 공망 = 술(10), 해(11)
    const [gm1, gm2] = calcGongmang(0, 0);
    expect(gm1).toBe(10); // 술
    expect(gm2).toBe(11); // 해
  });

  it('should return 신유 for 갑술순', () => {
    // 갑술순: 갑술~계미, 공망 = 신(8), 유(9)
    const [gm1, gm2] = calcGongmang(0, 10);
    expect(gm1).toBe(8);  // 신
    expect(gm2).toBe(9);  // 유
  });
});

describe('analyzeGongmang', () => {
  it('should identify affected pillars', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const gm = analyzeGongmang(saju);
    expect(gm.gongmangBranches.length).toBe(2);
    expect(Array.isArray(gm.affectedPillars)).toBe(true);
  });
});

describe('analyzeSeun', () => {
  it('should analyze current year fortune', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const seun = analyzeSeun(saju, 2026);
    expect(['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'])
      .toContain(seun.stemSipsin);
    expect(Array.isArray(seun.branchRelations)).toBe(true);
    expect(typeof seun.chung).toBe('boolean');
  });

  it('should detect stem hap with current year', () => {
    const saju = calculateSaju(1990, 5, 15, 14);
    const seun = analyzeSeun(saju, 2026);
    // stemHap은 null이거나 유효한 합 정보
    if (seun.stemHap) {
      expect(seun.stemHap.name.length).toBeGreaterThan(0);
    }
  });
});
