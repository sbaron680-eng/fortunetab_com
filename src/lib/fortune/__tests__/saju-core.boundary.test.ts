/**
 * Saju 경계 조건 회귀 테스트 — 2026-04-23 추가
 *
 * 정밀 검토(Track C-2)에서 발견된 버그 방지:
 * - 23시 출생자의 일주·시주 천간 오차 (조자시 롤오버 미처리)
 * - hourToBranchIdx에 무한수·음수 입력 시 silent 오동작
 */
import { describe, it, expect } from 'vitest';
import { calculateSaju, hourToBranchIdx, calcDayPillar } from '../saju-core';

describe('자시(23시) 경계 — 조자시 롤오버', () => {
  it('22시 출생 → 당일 일주, 해시 시주', () => {
    const r22 = calculateSaju(2000, 3, 15, 22);
    expect(r22.hour?.branchIdx).toBe(11); // 해(亥)
    // 비교: 같은 날 아침 기준 일주와 같아야 함
    const rMorning = calculateSaju(2000, 3, 15, 9);
    expect(r22.day.stemIdx).toBe(rMorning.day.stemIdx);
    expect(r22.day.branchIdx).toBe(rMorning.day.branchIdx);
  });

  it('23시 출생 → 다음날 일주 + 자시 시주 (조자시)', () => {
    const r23 = calculateSaju(2000, 3, 15, 23);
    expect(r23.hour?.branchIdx).toBe(0); // 자(子)

    // 일주는 반드시 다음날(3/16) 일주와 일치해야 함
    const nextDayPillar = calcDayPillar(2000, 3, 16);
    expect(r23.day.stemIdx).toBe(nextDayPillar.stemIdx);
    expect(r23.day.branchIdx).toBe(nextDayPillar.branchIdx);

    // 같은 날 아침 일주와는 반드시 달라야 함 (롤오버 증명)
    const rMorning = calculateSaju(2000, 3, 15, 9);
    expect(
      r23.day.stemIdx !== rMorning.day.stemIdx || r23.day.branchIdx !== rMorning.day.branchIdx
    ).toBe(true);
  });

  it('23시 출생 — 월말 경계 롤오버 (31일 → 다음달 1일)', () => {
    // 2000-03-31 23시 → 일주는 2000-04-01 기준
    const r = calculateSaju(2000, 3, 31, 23);
    const expected = calcDayPillar(2000, 4, 1);
    expect(r.day.stemIdx).toBe(expected.stemIdx);
    expect(r.day.branchIdx).toBe(expected.branchIdx);
  });

  it('23시 출생 — 연말 경계 롤오버 (12/31 → 다음해 1/1)', () => {
    const r = calculateSaju(2023, 12, 31, 23);
    const expected = calcDayPillar(2024, 1, 1);
    expect(r.day.stemIdx).toBe(expected.stemIdx);
    expect(r.day.branchIdx).toBe(expected.branchIdx);
  });

  it('23시 출생이어도 연주·월주는 당일 기준 유지 (절기로만 변함)', () => {
    // 2000-03-15 (경칩 후, 입춘 훨씬 지난 시점) — 23시 롤오버로 연/월 바뀌면 안 됨
    const r22 = calculateSaju(2000, 3, 15, 22);
    const r23 = calculateSaju(2000, 3, 15, 23);
    expect(r22.year.stemIdx).toBe(r23.year.stemIdx);
    expect(r22.year.branchIdx).toBe(r23.year.branchIdx);
    expect(r22.month.stemIdx).toBe(r23.month.stemIdx);
    expect(r22.month.branchIdx).toBe(r23.month.branchIdx);
  });
});

describe('hourToBranchIdx 입력 검증', () => {
  it('정상 범위 0~23 동작', () => {
    expect(hourToBranchIdx(0)).toBe(0);
    expect(hourToBranchIdx(23)).toBe(0);
    expect(hourToBranchIdx(12)).toBe(6); // 오시
  });

  it('범위 밖 입력은 RangeError로 조용한 실패 방지', () => {
    expect(() => hourToBranchIdx(-1)).toThrow(RangeError);
    expect(() => hourToBranchIdx(24)).toThrow(RangeError);
    expect(() => hourToBranchIdx(NaN)).toThrow(RangeError);
    expect(() => hourToBranchIdx(Infinity)).toThrow(RangeError);
  });
});
