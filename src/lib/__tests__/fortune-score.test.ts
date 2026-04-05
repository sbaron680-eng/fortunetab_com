import { describe, it, expect } from 'vitest';
import { calcFortuneScore, type FortuneGrade } from '../fortune-score';

describe('calcFortuneScore', () => {
  const targetDate = new Date(2026, 3, 5); // 2026-04-05

  it('returns all expected fields', () => {
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    expect(result).toHaveProperty('biorhythm');
    expect(result).toHaveProperty('daunPhase');
    expect(result).toHaveProperty('daunBonus');
    expect(result).toHaveProperty('daunSipsin');
    expect(result).toHaveProperty('daunPeriod');
    expect(result).toHaveProperty('fortuneScore');
    expect(result).toHaveProperty('fortunePercent');
    expect(result).toHaveProperty('grade');
  });

  it('fortuneScore is in [-1, 1]', () => {
    const result = calcFortuneScore('1990-01-15', '자시', 'female', targetDate);
    expect(result.fortuneScore).toBeGreaterThanOrEqual(-1);
    expect(result.fortuneScore).toBeLessThanOrEqual(1);
  });

  it('fortunePercent is in [0, 100]', () => {
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    expect(result.fortunePercent).toBeGreaterThanOrEqual(0);
    expect(result.fortunePercent).toBeLessThanOrEqual(100);
  });

  it('grade is one of optimal/good/neutral/rest', () => {
    const validGrades: FortuneGrade[] = ['optimal', 'good', 'neutral', 'rest'];
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    expect(validGrades).toContain(result.grade.grade);
    expect(result.grade.label).toBeTruthy();
    expect(result.grade.description).toBeTruthy();
  });

  it('daunPhase is one of 4 phases', () => {
    const validPhases = ['상승기', '안정기', '전환기', '하강기'];
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    expect(validPhases).toContain(result.daunPhase);
  });

  it('daunBonus matches phase', () => {
    const EXPECTED_BONUS: Record<string, number> = {
      '상승기': 0.22, '안정기': 0.05, '전환기': -0.08, '하강기': -0.18,
    };
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    expect(result.daunBonus).toBe(EXPECTED_BONUS[result.daunPhase]);
  });

  it('accepts Date object for birthDate', () => {
    const result = calcFortuneScore(new Date(1990, 0, 15), '모름', 'male', targetDate);
    expect(result.fortuneScore).toBeGreaterThanOrEqual(-1);
    expect(result.fortuneScore).toBeLessThanOrEqual(1);
  });

  it('throws on invalid date string', () => {
    expect(() => calcFortuneScore('invalid', '모름', 'male', targetDate)).toThrow('Invalid birth_date format');
  });

  it('produces deterministic results', () => {
    const a = calcFortuneScore('1985-07-23', '오시', 'female', targetDate);
    const b = calcFortuneScore('1985-07-23', '오시', 'female', targetDate);
    expect(a.fortuneScore).toBe(b.fortuneScore);
    expect(a.daunPhase).toBe(b.daunPhase);
    expect(a.grade.grade).toBe(b.grade.grade);
  });

  it('different birth dates produce different results', () => {
    const a = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    const b = calcFortuneScore('1995-06-20', '모름', 'male', targetDate);
    // At minimum biorhythm differs (different elapsed days)
    expect(a.biorhythm.elapsedDays).not.toBe(b.biorhythm.elapsedDays);
  });

  it('fortuneScore = clamp(bioScore + daunBonus)', () => {
    const result = calcFortuneScore('1990-01-15', '모름', 'male', targetDate);
    const rawExpected = result.biorhythm.bioScore + result.daunBonus;
    const clamped = Math.min(1, Math.max(-1, rawExpected));
    const rounded = Math.round(clamped * 10000) / 10000;
    expect(result.fortuneScore).toBe(rounded);
  });
});
