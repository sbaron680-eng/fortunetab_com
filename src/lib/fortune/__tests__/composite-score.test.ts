/**
 * composite-score.ts + engine.ts 통합 테스트
 */

import { describe, it, expect } from 'vitest';
import { calcCompositeScore, getGrade } from '../composite-score';
import { calculateFortuneProfile } from '../engine';
import { calcBiorhythm } from '../../biorhythm';
import type { BirthData, WesternProfile } from '../types';

// ─── Grade Classification ─────────────────────────────────────────────

describe('getGrade', () => {
  it('should return optimal for score >= 0.40', () => {
    expect(getGrade(0.50).key).toBe('optimal');
    expect(getGrade(0.40).key).toBe('optimal');
  });

  it('should return good for score >= 0.10', () => {
    expect(getGrade(0.30).key).toBe('good');
    expect(getGrade(0.10).key).toBe('good');
  });

  it('should return neutral for score >= -0.15', () => {
    expect(getGrade(0.00).key).toBe('neutral');
    expect(getGrade(-0.15).key).toBe('neutral');
  });

  it('should return rest for score < -0.15', () => {
    expect(getGrade(-0.20).key).toBe('rest');
    expect(getGrade(-1.0).key).toBe('rest');
  });

  it('should include both ko and en labels', () => {
    const grade = getGrade(0.50);
    expect(grade.label).toBe('발굴 최적');
    expect(grade.labelEn).toBe('Optimal');
  });
});

// ─── Composite Score ──────────────────────────────────────────────────

describe('calcCompositeScore', () => {
  const mockWestern: WesternProfile = {
    sunSign: { sign: 'taurus', symbol: '♉', element: 'earth', modality: 'fixed', rulingPlanet: 'Venus', dateRange: 'Apr 20 – May 20' },
    moonSign: { sign: 'cancer', symbol: '♋', element: 'water', modality: 'cardinal', rulingPlanet: 'Moon', dateRange: 'Jun 21 – Jul 22' },
    risingSign: null,
  };

  it('should produce score in [-1, 1] range', () => {
    const bio = calcBiorhythm(new Date(1990, 4, 15), new Date(2026, 3, 6));
    const result = calcCompositeScore(bio, '상승기', '목', mockWestern);
    expect(result.fortuneScore).toBeGreaterThanOrEqual(-1);
    expect(result.fortuneScore).toBeLessThanOrEqual(1);
  });

  it('should produce percent in [0, 100] range', () => {
    const bio = calcBiorhythm(new Date(1990, 4, 15), new Date(2026, 3, 6));
    const result = calcCompositeScore(bio, '상승기', '목', mockWestern);
    expect(result.fortunePercent).toBeGreaterThanOrEqual(0);
    expect(result.fortunePercent).toBeLessThanOrEqual(100);
  });

  it('should apply daunBonus correctly', () => {
    const bio = calcBiorhythm(new Date(1990, 4, 15), new Date(2026, 3, 6));
    const rising = calcCompositeScore(bio, '상승기', '목', mockWestern);
    const declining = calcCompositeScore(bio, '하강기', '목', mockWestern);
    // 상승기(+0.22) should produce higher score than 하강기(-0.18)
    expect(rising.fortuneScore).toBeGreaterThan(declining.fortuneScore);
  });

  it('should include grade information', () => {
    const bio = calcBiorhythm(new Date(1990, 4, 15), new Date(2026, 3, 6));
    const result = calcCompositeScore(bio, '안정기', '목', mockWestern);
    expect(result.grade).toBeDefined();
    expect(result.grade.key).toBeDefined();
    expect(result.grade.label).toBeDefined();
  });
});

// ─── Full Engine Integration ──────────────────────────────────────────

describe('calculateFortuneProfile', () => {
  it('should produce complete profile from birth data', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      hour: 14,
      minute: 30,
      gender: 'male',
      location: {
        name: 'Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
    };

    const profile = calculateFortuneProfile(birth);

    // Eastern
    expect(profile.eastern.saju.year).toBeDefined();
    expect(profile.eastern.saju.month).toBeDefined();
    expect(profile.eastern.saju.day).toBeDefined();
    expect(profile.eastern.saju.hour).not.toBeNull();
    expect(profile.eastern.sipsinMap.length).toBeGreaterThan(0);
    expect(profile.eastern.daeun.length).toBe(8);
    expect(profile.eastern.daunPhase).toBeDefined();

    // Western
    expect(profile.western.sunSign.sign).toBe('taurus');
    expect(profile.western.moonSign).toBeDefined();
    expect(profile.western.risingSign).not.toBeNull();

    // Composite
    expect(profile.composite.fortuneScore).toBeGreaterThanOrEqual(-1);
    expect(profile.composite.fortuneScore).toBeLessThanOrEqual(1);
    expect(profile.composite.fortunePercent).toBeGreaterThanOrEqual(0);
    expect(profile.composite.fortunePercent).toBeLessThanOrEqual(100);
    expect(profile.composite.grade).toBeDefined();
  });

  it('should work without hour and location', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      gender: 'female',
    };

    const profile = calculateFortuneProfile(birth);

    expect(profile.eastern.saju.hour).toBeNull();
    expect(profile.western.risingSign).toBeNull();
    expect(profile.composite.fortuneScore).toBeGreaterThanOrEqual(-1);
    expect(profile.composite.fortuneScore).toBeLessThanOrEqual(1);
  });

  it('should produce different scores for different dates', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      gender: 'male',
    };

    const today = calculateFortuneProfile(birth, new Date(2026, 3, 6));
    const nextWeek = calculateFortuneProfile(birth, new Date(2026, 3, 13));

    // Biorhythm changes daily, so scores should differ
    expect(today.composite.bioScore).not.toBe(nextWeek.composite.bioScore);
  });

  it('should produce consistent results for same input', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      hour: 14,
      gender: 'male',
    };

    const targetDate = new Date(2026, 3, 6);
    const a = calculateFortuneProfile(birth, targetDate);
    const b = calculateFortuneProfile(birth, targetDate);

    expect(a.composite.fortuneScore).toBe(b.composite.fortuneScore);
    expect(a.eastern.saju.dayElem).toBe(b.eastern.saju.dayElem);
    expect(a.western.sunSign.sign).toBe(b.western.sunSign.sign);
  });
});
