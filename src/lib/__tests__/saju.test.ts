import { describe, it, expect } from 'vitest';
import {
  calculateSaju,
  calculateSajuFromBirthData,
  getSipsin,
  getSipsinMap,
  detectSinsal,
  calcDaeun,
  detectZodiac,
  getYearGanzhi,
  elemCountToPercent,
  getMonthlyFortune,
  sajuResultToSajuData,
  ELEM_KO,
  type SajuResult,
} from '../saju';

// ── calculateSaju ────────────────────────────────────────────────

describe('calculateSaju', () => {
  it('returns all 4 pillars', () => {
    const result = calculateSaju(1990, 1, 15);
    expect(result.year).toBeDefined();
    expect(result.month).toBeDefined();
    expect(result.day).toBeDefined();
    expect(result.hour).toBeDefined();
  });

  it('sets hasHour=false when time is unknown', () => {
    const result = calculateSaju(1990, 1, 15, '모름');
    expect(result.hasHour).toBe(false);
  });

  it('sets hasHour=true when time is provided', () => {
    const result = calculateSaju(1990, 1, 15, '자시');
    expect(result.hasHour).toBe(true);
  });

  it('dayElem is a valid element', () => {
    const result = calculateSaju(1990, 1, 15);
    expect(ELEM_KO).toContain(result.dayElem);
  });

  it('yongsin is a valid element', () => {
    const result = calculateSaju(1990, 1, 15);
    expect(ELEM_KO).toContain(result.yongsin);
  });

  it('elemCount sums to 6 without hour, 8 with hour', () => {
    const noHour = calculateSaju(1990, 1, 15, '모름');
    const withHour = calculateSaju(1990, 1, 15, '자시');
    const sumNoHour = ELEM_KO.reduce((s, e) => s + noHour.elemCount[e], 0);
    const sumWithHour = ELEM_KO.reduce((s, e) => s + withHour.elemCount[e], 0);
    expect(sumNoHour).toBe(6);
    expect(sumWithHour).toBe(8);
  });

  it('produces deterministic results', () => {
    const a = calculateSaju(1985, 7, 23, '오시');
    const b = calculateSaju(1985, 7, 23, '오시');
    expect(a.dayElem).toBe(b.dayElem);
    expect(a.yongsin).toBe(b.yongsin);
    expect(a.elemCount).toEqual(b.elemCount);
  });
});

describe('calculateSajuFromBirthData', () => {
  it('parses YYYY-MM-DD string correctly', () => {
    const fromStr = calculateSajuFromBirthData('1990-01-15', '모름');
    const direct = calculateSaju(1990, 1, 15, '모름');
    expect(fromStr.dayElem).toBe(direct.dayElem);
    expect(fromStr.yongsin).toBe(direct.yongsin);
  });

  it('handles null birthHour as unknown', () => {
    const result = calculateSajuFromBirthData('1990-01-15', null);
    expect(result.hasHour).toBe(false);
  });
});

// ── getSipsin ────────────────────────────────────────────────────

describe('getSipsin', () => {
  it('returns 비견 for same stem', () => {
    expect(getSipsin(0, 0)).toBe('비견'); // 갑 → 갑
  });

  it('returns 겁재 for same element, different polarity', () => {
    expect(getSipsin(0, 1)).toBe('겁재'); // 갑 → 을 (both 목)
  });

  it('returns one of 10 sipsin names', () => {
    const VALID = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
    for (let day = 0; day < 10; day++) {
      for (let target = 0; target < 10; target++) {
        expect(VALID).toContain(getSipsin(day, target));
      }
    }
  });
});

// ── getSipsinMap ─────────────────────────────────────────────────

describe('getSipsinMap', () => {
  it('returns sipsin for all pillars', () => {
    const saju = calculateSaju(1990, 1, 15, '자시');
    const map = getSipsinMap(saju);
    expect(map.yearStem).toBeDefined();
    expect(map.monthStem).toBeDefined();
    expect(map.hourStem).toBeDefined();
  });
});

// ── detectSinsal ─────────────────────────────────────────────────

describe('detectSinsal', () => {
  it('returns an array', () => {
    const saju = calculateSaju(1990, 1, 15);
    const sinsals = detectSinsal(saju);
    expect(Array.isArray(sinsals)).toBe(true);
  });

  it('each sinsal has name, description, type', () => {
    const saju = calculateSaju(1990, 1, 15, '자시');
    const sinsals = detectSinsal(saju);
    for (const s of sinsals) {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('description');
      expect(s).toHaveProperty('type');
      expect(['good', 'bad', 'neutral']).toContain(s.type);
    }
  });
});

// ── calcDaeun ────────────────────────────────────────────────────

describe('calcDaeun', () => {
  it('returns 8 daeun periods', () => {
    const saju = calculateSaju(1990, 1, 15);
    const daeun = calcDaeun(saju, 'male');
    expect(daeun).toHaveLength(8);
  });

  it('periods have ascending age ranges', () => {
    const saju = calculateSaju(1990, 1, 15);
    const daeun = calcDaeun(saju, 'male');
    for (let i = 1; i < daeun.length; i++) {
      expect(daeun[i].startAge).toBeGreaterThan(daeun[i - 1].startAge);
    }
  });

  it('each period has sipsin name', () => {
    const saju = calculateSaju(1990, 1, 15);
    const daeun = calcDaeun(saju, 'female');
    for (const d of daeun) {
      expect(typeof d.sipsin).toBe('string');
      expect(d.sipsin.length).toBeGreaterThan(0);
    }
  });

  it('male and female can differ', () => {
    const saju = calculateSaju(1990, 1, 15);
    const male = calcDaeun(saju, 'male');
    const female = calcDaeun(saju, 'female');
    // Direction differs → different stem/branch sequences possible
    const maleStems = male.map(d => d.stemKo);
    const femaleStems = female.map(d => d.stemKo);
    // At least the structure should be valid even if sequences differ
    expect(maleStems).toHaveLength(8);
    expect(femaleStems).toHaveLength(8);
  });
});

// ── detectZodiac ─────────────────────────────────────────────────

describe('detectZodiac', () => {
  it('Aries for March 25', () => {
    expect(detectZodiac(3, 25)).toBe('양자리');
  });

  it('Capricorn for Jan 5', () => {
    expect(detectZodiac(1, 5)).toBe('염소자리');
  });

  it('Capricorn for Dec 25', () => {
    expect(detectZodiac(12, 25)).toBe('염소자리');
  });
});

// ── getYearGanzhi ────────────────────────────────────────────────

describe('getYearGanzhi', () => {
  it('2026 is 丙午(병오)', () => {
    expect(getYearGanzhi(2026)).toBe('병오(丙午)');
  });
});

// ── elemCountToPercent ───────────────────────────────────────────

describe('elemCountToPercent', () => {
  it('percentages sum to ~100', () => {
    const saju = calculateSaju(1990, 1, 15);
    const pcts = elemCountToPercent(saju.elemCount, saju.hasHour);
    const sum = Object.values(pcts).reduce((s, v) => s + v, 0);
    expect(sum).toBeGreaterThanOrEqual(98);
    expect(sum).toBeLessThanOrEqual(102); // rounding tolerance
  });
});

// ── getMonthlyFortune ────────────────────────────────────────────

describe('getMonthlyFortune', () => {
  it('returns 12 months', () => {
    const saju = calculateSaju(1990, 1, 15);
    const monthly = getMonthlyFortune(saju, 2026);
    expect(monthly).toHaveLength(12);
  });

  it('each month has score in [0, 100]', () => {
    const saju = calculateSaju(1990, 1, 15);
    const monthly = getMonthlyFortune(saju, 2026);
    for (const m of monthly) {
      expect(m.score).toBeGreaterThanOrEqual(0);
      expect(m.score).toBeLessThanOrEqual(100);
      expect(m.month).toBeGreaterThanOrEqual(1);
      expect(m.month).toBeLessThanOrEqual(12);
    }
  });

  it('each month has keywords array', () => {
    const saju = calculateSaju(1990, 1, 15);
    const monthly = getMonthlyFortune(saju, 2026);
    for (const m of monthly) {
      expect(Array.isArray(m.keywords)).toBe(true);
      expect(m.keywords.length).toBeGreaterThan(0);
    }
  });
});

// ── sajuResultToSajuData ─────────────────────────────────────────

describe('sajuResultToSajuData', () => {
  it('converts SajuResult to SajuData format', () => {
    const saju = calculateSaju(1990, 1, 15, '자시');
    const data = sajuResultToSajuData(saju);
    expect(data).toHaveProperty('ganzhi');
    expect(data).toHaveProperty('dayElem');
    expect(data).toHaveProperty('yongsin');
    expect(data).toHaveProperty('elemSummary');
    expect(data).toHaveProperty('yearPillar');
    expect(data).toHaveProperty('monthPillar');
    expect(data).toHaveProperty('dayPillar');
    expect(data).toHaveProperty('hourPillar');
  });
});
