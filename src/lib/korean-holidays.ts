/**
 * 대한민국 공휴일 · 기념일 데이터 (2025-2027)
 * holiday  : 법정 공휴일 (빨간날)
 * substitute: 대체공휴일 (빨간날)
 * memorial : 기념일 (빨간날 아닌 사회적 기념일)
 */

export type HolidayType = 'holiday' | 'substitute' | 'memorial';

export interface HolidayInfo {
  name: string;
  type: HolidayType;
}

// YYYY-MM-DD 키
const HOLIDAYS: Record<string, HolidayInfo> = {
  // ── 2025 ──────────────────────────────────────────────────────────────────
  '2025-01-01': { name: '신정',              type: 'holiday'    },
  '2025-01-28': { name: '설날 연휴',          type: 'holiday'    },
  '2025-01-29': { name: '설날',              type: 'holiday'    },
  '2025-01-30': { name: '설날 연휴',          type: 'holiday'    },
  '2025-03-01': { name: '삼일절',             type: 'holiday'    },
  '2025-05-05': { name: '어린이날·석가탄신일', type: 'holiday'    },
  '2025-05-06': { name: '대체공휴일',          type: 'substitute' },
  '2025-06-06': { name: '현충일',             type: 'holiday'    },
  '2025-08-15': { name: '광복절',             type: 'holiday'    },
  '2025-10-03': { name: '개천절',             type: 'holiday'    },
  '2025-10-05': { name: '추석 연휴',          type: 'holiday'    },
  '2025-10-06': { name: '추석',              type: 'holiday'    },
  '2025-10-07': { name: '추석 연휴',          type: 'holiday'    },
  '2025-10-08': { name: '대체공휴일',          type: 'substitute' },
  '2025-10-09': { name: '한글날',             type: 'holiday'    },
  '2025-12-25': { name: '성탄절',             type: 'holiday'    },

  // ── 2026 ──────────────────────────────────────────────────────────────────
  '2026-01-01': { name: '신정',              type: 'holiday'    },
  '2026-02-16': { name: '설날 연휴',          type: 'holiday'    },
  '2026-02-17': { name: '설날',              type: 'holiday'    },
  '2026-02-18': { name: '설날 연휴',          type: 'holiday'    },
  '2026-03-01': { name: '삼일절',             type: 'holiday'    },
  '2026-05-05': { name: '어린이날',           type: 'holiday'    },
  '2026-05-24': { name: '석가탄신일',          type: 'holiday'    },
  '2026-05-25': { name: '대체공휴일',          type: 'substitute' },
  '2026-06-06': { name: '현충일',             type: 'holiday'    },
  '2026-08-15': { name: '광복절',             type: 'holiday'    },
  '2026-09-23': { name: '추석 연휴',          type: 'holiday'    },
  '2026-09-24': { name: '추석',              type: 'holiday'    },
  '2026-09-25': { name: '추석 연휴',          type: 'holiday'    },
  '2026-10-03': { name: '개천절',             type: 'holiday'    },
  '2026-10-09': { name: '한글날',             type: 'holiday'    },
  '2026-12-25': { name: '성탄절',             type: 'holiday'    },

  // ── 2027 ──────────────────────────────────────────────────────────────────
  '2027-01-01': { name: '신정',              type: 'holiday'    },
  '2027-02-05': { name: '설날 연휴',          type: 'holiday'    },
  '2027-02-06': { name: '설날',              type: 'holiday'    },
  '2027-02-07': { name: '설날 연휴',          type: 'holiday'    },
  '2027-02-08': { name: '대체공휴일',          type: 'substitute' },
  '2027-03-01': { name: '삼일절',             type: 'holiday'    },
  '2027-05-05': { name: '어린이날',           type: 'holiday'    },
  '2027-05-13': { name: '석가탄신일',          type: 'holiday'    },
  '2027-06-06': { name: '현충일',             type: 'holiday'    },
  '2027-08-15': { name: '광복절',             type: 'holiday'    },
  '2027-09-14': { name: '추석 연휴',          type: 'holiday'    },
  '2027-09-15': { name: '추석',              type: 'holiday'    },
  '2027-09-16': { name: '추석 연휴',          type: 'holiday'    },
  '2027-10-03': { name: '개천절',             type: 'holiday'    },
  '2027-10-09': { name: '한글날',             type: 'holiday'    },
  '2027-12-25': { name: '성탄절',             type: 'holiday'    },
};

// 고정 기념일 (MM-DD 키, 비법정)
const MEMORIALS: Record<string, string> = {
  '02-14': '발렌타인데이',
  '03-14': '화이트데이',
  '05-08': '어버이날',
  '05-15': '스승의날',
  '06-25': '6·25 한국전쟁',
  '11-11': '빼빼로데이',
};

/**
 * @param year  연도
 * @param month 0-based 월 (JS Date 호환)
 * @param day   일
 */
export function getHoliday(year: number, month: number, day: number): HolidayInfo | null {
  const mm  = String(month + 1).padStart(2, '0');
  const dd  = String(day).padStart(2, '0');
  const key = `${year}-${mm}-${dd}`;
  if (HOLIDAYS[key]) return HOLIDAYS[key];
  const memKey = `${mm}-${dd}`;
  if (MEMORIALS[memKey]) return { name: MEMORIALS[memKey], type: 'memorial' };
  return null;
}

// ── 절기 데이터 ────────────────────────────────────────────────────────────

export interface SolarTerm { name: string; symbol: string; }

export const SOLAR_TERMS_2025: Record<string, SolarTerm> = {
  '2025-02-03': { name: '입춘', symbol: '🌱' },
  '2025-03-20': { name: '춘분', symbol: '🌸' },
  '2025-05-05': { name: '입하', symbol: '☀️' },
  '2025-06-21': { name: '하지', symbol: '🌞' },
  '2025-08-07': { name: '입추', symbol: '🍂' },
  '2025-09-23': { name: '추분', symbol: '🍁' },
  '2025-11-07': { name: '입동', symbol: '❄️' },
  '2025-12-22': { name: '동지', symbol: '⛄' },
};
export const SOLAR_TERMS_2026: Record<string, SolarTerm> = {
  '2026-02-04': { name: '입춘', symbol: '🌱' },
  '2026-03-20': { name: '춘분', symbol: '🌸' },
  '2026-05-05': { name: '입하', symbol: '☀️' },
  '2026-06-21': { name: '하지', symbol: '🌞' },
  '2026-08-07': { name: '입추', symbol: '🍂' },
  '2026-09-23': { name: '추분', symbol: '🍁' },
  '2026-11-07': { name: '입동', symbol: '❄️' },
  '2026-12-22': { name: '동지', symbol: '⛄' },
};
export const SOLAR_TERMS_2027: Record<string, SolarTerm> = {
  '2027-02-03': { name: '입춘', symbol: '🌱' },
  '2027-03-20': { name: '춘분', symbol: '🌸' },
  '2027-05-05': { name: '입하', symbol: '☀️' },
  '2027-06-21': { name: '하지', symbol: '🌞' },
  '2027-08-07': { name: '입추', symbol: '🍂' },
  '2027-09-23': { name: '추분', symbol: '🍁' },
  '2027-11-07': { name: '입동', symbol: '❄️' },
  '2027-12-22': { name: '동지', symbol: '⛄' },
};

const ALL_SOLAR_TERMS: Record<string, SolarTerm> = {
  ...SOLAR_TERMS_2025,
  ...SOLAR_TERMS_2026,
  ...SOLAR_TERMS_2027,
};

export function getSolarTerm(year: number, month: number, day: number): SolarTerm | null {
  const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return ALL_SOLAR_TERMS[key] ?? null;
}
