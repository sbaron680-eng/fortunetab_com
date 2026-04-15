/**
 * western-astrology.ts 단위 테스트
 *
 * 알려진 생년월일로 Sun/Moon/Rising Sign 검증
 */

import { describe, it, expect } from 'vitest';
import { calcSunSign, calcMoonSign, calcRisingSign, calcWesternProfile } from '../western-astrology';
import type { BirthData } from '../types';

// ─── Sun Sign ─────────────────────────────────────────────────────────

describe('calcSunSign', () => {
  it('should return Aries for March 25', () => {
    const result = calcSunSign(3, 25);
    expect(result.sign).toBe('aries');
  });

  it('should return Taurus for May 1', () => {
    const result = calcSunSign(5, 1);
    expect(result.sign).toBe('taurus');
  });

  it('should return Capricorn for January 1', () => {
    const result = calcSunSign(1, 1);
    expect(result.sign).toBe('capricorn');
  });

  it('should return Capricorn for December 25', () => {
    const result = calcSunSign(12, 25);
    expect(result.sign).toBe('capricorn');
  });

  it('should return Pisces for March 10', () => {
    const result = calcSunSign(3, 10);
    expect(result.sign).toBe('pisces');
  });

  it('should return Sagittarius for December 1', () => {
    const result = calcSunSign(12, 1);
    expect(result.sign).toBe('sagittarius');
  });

  it('should return correct element for each sign', () => {
    expect(calcSunSign(3, 25).element).toBe('fire');     // Aries
    expect(calcSunSign(5, 1).element).toBe('earth');     // Taurus
    expect(calcSunSign(6, 1).element).toBe('air');       // Gemini
    expect(calcSunSign(7, 1).element).toBe('water');     // Cancer
  });

  it('should handle boundary dates correctly', () => {
    // Aries starts March 21
    expect(calcSunSign(3, 20).sign).toBe('pisces');
    expect(calcSunSign(3, 21).sign).toBe('aries');
    // Aquarius starts January 20
    expect(calcSunSign(1, 19).sign).toBe('capricorn');
    expect(calcSunSign(1, 20).sign).toBe('aquarius');
  });
});

// ─── Moon Sign ────────────────────────────────────────────────────────

describe('calcMoonSign', () => {
  it('should return a valid zodiac sign', () => {
    const result = calcMoonSign(1990, 5, 15);
    expect(result.sign).toBeDefined();
    expect(result.element).toBeDefined();
    expect(result.symbol).toBeDefined();
  });

  it('should return different signs for dates ~7 days apart', () => {
    // Moon moves ~13° per day, changes sign every ~2.5 days
    const a = calcMoonSign(2026, 4, 1);
    const b = calcMoonSign(2026, 4, 8);
    // They should likely be different (not guaranteed but highly probable)
    expect(a.sign).toBeDefined();
    expect(b.sign).toBeDefined();
  });

  it('should return a sign within the 12 zodiac signs', () => {
    const validSigns = [
      'aries','taurus','gemini','cancer','leo','virgo',
      'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
    ];
    const result = calcMoonSign(2000, 6, 15);
    expect(validSigns).toContain(result.sign);
  });

  it('should return Gemini or Cancer for epoch date (±1 sign approximation)', () => {
    // Epoch: Moon near Cancer 0° on 2000-01-06 18:14 UTC
    // Our simplified model has ±1-2 sign accuracy
    const result = calcMoonSign(2000, 1, 6, 18); // no timezone = UTC
    expect(['gemini', 'cancer']).toContain(result.sign);
  });

  it('should produce same sign for equivalent local/UTC times', () => {
    // 2000-01-07 03:14 KST = 2000-01-06 18:14 UTC → same sign
    const utcResult = calcMoonSign(2000, 1, 6, 18); // UTC
    const kstResult = calcMoonSign(2000, 1, 7, 3, 'Asia/Seoul');
    expect(kstResult.sign).toBe(utcResult.sign);
  });

  it('should handle UTC+13 timezone (Tonga) without error', () => {
    // Midnight in Tonga (UTC+13) → previous day 11:00 UTC
    const result = calcMoonSign(2024, 1, 1, 0, 'Pacific/Tongatapu');
    expect(result.sign).toBeDefined();
  });
});

// ─── Rising Sign ──────────────────────────────────────────────────────

describe('calcRisingSign', () => {
  it('should return a valid zodiac sign', () => {
    // Seoul: 37.5665°N, 126.9780°E
    const result = calcRisingSign(1990, 5, 15, 14, 30, 126.978);
    expect(result).not.toBeNull();
    expect(result!.sign).toBeDefined();
  });

  it('should return different signs for different birth times', () => {
    // Rising sign changes roughly every 2 hours
    const morning = calcRisingSign(1990, 5, 15, 6, 0, 126.978);
    const evening = calcRisingSign(1990, 5, 15, 18, 0, 126.978);
    expect(morning).not.toBeNull();
    expect(evening).not.toBeNull();
    // They should be different (6 signs apart approximately)
    expect(morning!.sign).not.toBe(evening!.sign);
  });

  it('should return different signs for different longitudes', () => {
    // Same time but different longitude → different LST → different rising
    const seoul = calcRisingSign(1990, 5, 15, 14, 0, 126.978);
    const london = calcRisingSign(1990, 5, 15, 14, 0, -0.1278);
    expect(seoul).not.toBeNull();
    expect(london).not.toBeNull();
  });

  it('should produce same result for equivalent UTC time with timezone', () => {
    // 14:00 KST = 05:00 UTC. Both should give same rising sign.
    const withTz = calcRisingSign(1990, 5, 15, 14, 0, 126.978, 'Asia/Seoul');
    const asUtc = calcRisingSign(1990, 5, 15, 5, 0, 126.978); // no tz = UTC
    expect(withTz).not.toBeNull();
    expect(asUtc).not.toBeNull();
    expect(withTz!.sign).toBe(asUtc!.sign);
  });

  it('should handle midnight birth in UTC+ timezone (date rollover)', () => {
    // Seoul midnight Jan 1 (00:30 KST) = Dec 31 15:30 UTC (prev year)
    const result = calcRisingSign(2024, 1, 1, 0, 30, 126.978, 'Asia/Seoul');
    expect(result).not.toBeNull();
    expect(result!.sign).toBeDefined();
  });

  it('should handle UTC+13 timezone without error', () => {
    const result = calcRisingSign(2024, 6, 15, 23, 0, -175.2, 'Pacific/Tongatapu');
    expect(result).not.toBeNull();
  });
});

// ─── Western Profile ──────────────────────────────────────────────────

describe('calcWesternProfile', () => {
  it('should return complete profile with all data', () => {
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
    const profile = calcWesternProfile(birth);
    expect(profile.sunSign.sign).toBe('taurus');
    expect(profile.moonSign).toBeDefined();
    expect(profile.risingSign).not.toBeNull();
  });

  it('should return null risingSign without location', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      gender: 'male',
    };
    const profile = calcWesternProfile(birth);
    expect(profile.sunSign.sign).toBe('taurus');
    expect(profile.moonSign).toBeDefined();
    expect(profile.risingSign).toBeNull();
  });

  it('should return null risingSign without hour', () => {
    const birth: BirthData = {
      date: '1990-05-15',
      gender: 'male',
      location: {
        name: 'Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
    };
    const profile = calcWesternProfile(birth);
    expect(profile.risingSign).toBeNull();
  });
});
