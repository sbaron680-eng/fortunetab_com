import { describe, it, expect } from 'vitest';
import { calcBiorhythm, calcWeekTrend, CYCLES } from '../biorhythm';

describe('calcBiorhythm', () => {
  const birth = new Date(1990, 0, 15); // 1990-01-15

  it('returns 4 cycles with correct names', () => {
    const result = calcBiorhythm(birth, new Date(2026, 3, 5));
    expect(result.cycles).toHaveLength(4);
    expect(result.cycles.map(c => c.nameEn)).toEqual([
      'physical', 'emotional', 'intellectual', 'intuitive',
    ]);
  });

  it('cycle raw values are in [-1, 1]', () => {
    const result = calcBiorhythm(birth, new Date(2026, 3, 5));
    for (const c of result.cycles) {
      expect(c.raw).toBeGreaterThanOrEqual(-1);
      expect(c.raw).toBeLessThanOrEqual(1);
    }
  });

  it('cycle percent values are in [0, 100]', () => {
    const result = calcBiorhythm(birth, new Date(2026, 3, 5));
    for (const c of result.cycles) {
      expect(c.percent).toBeGreaterThanOrEqual(0);
      expect(c.percent).toBeLessThanOrEqual(100);
    }
  });

  it('bioScore is in [-1, 1]', () => {
    const result = calcBiorhythm(birth, new Date(2026, 3, 5));
    expect(result.bioScore).toBeGreaterThanOrEqual(-1);
    expect(result.bioScore).toBeLessThanOrEqual(1);
  });

  it('bioPercent is in [0, 100]', () => {
    const result = calcBiorhythm(birth, new Date(2026, 3, 5));
    expect(result.bioPercent).toBeGreaterThanOrEqual(0);
    expect(result.bioPercent).toBeLessThanOrEqual(100);
  });

  it('elapsedDays is correct', () => {
    const target = new Date(1990, 0, 16); // 1 day later
    const result = calcBiorhythm(birth, target);
    expect(result.elapsedDays).toBe(1);
  });

  it('same day = elapsed 0, all cycles at sin(0) = 0', () => {
    const result = calcBiorhythm(birth, birth);
    expect(result.elapsedDays).toBe(0);
    for (const c of result.cycles) {
      expect(c.raw).toBe(0);
      expect(c.percent).toBe(50);
    }
    expect(result.bioScore).toBe(0);
    expect(result.bioPercent).toBe(50);
  });

  it('weights sum to 1.0', () => {
    const totalWeight = CYCLES.reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it('produces deterministic results for same inputs', () => {
    const a = calcBiorhythm(birth, new Date(2026, 5, 15));
    const b = calcBiorhythm(birth, new Date(2026, 5, 15));
    expect(a.bioScore).toBe(b.bioScore);
    expect(a.cycles).toEqual(b.cycles);
  });
});

describe('calcWeekTrend', () => {
  const birth = new Date(1990, 0, 15);

  it('returns 7 days of data', () => {
    const trend = calcWeekTrend(birth, new Date(2026, 3, 5));
    expect(trend).toHaveLength(7);
  });

  it('center day is at index 3', () => {
    const center = new Date(2026, 3, 5);
    const trend = calcWeekTrend(birth, center);
    expect(trend[3].date.getDate()).toBe(center.getDate());
  });

  it('all bioScores are in [-1, 1]', () => {
    const trend = calcWeekTrend(birth, new Date(2026, 3, 5));
    for (const day of trend) {
      expect(day.bioScore).toBeGreaterThanOrEqual(-1);
      expect(day.bioScore).toBeLessThanOrEqual(1);
    }
  });
});
