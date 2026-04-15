/**
 * Fortune Engine v2 — 서양 점성술 엔진
 *
 * MVP 범위: Sun Sign + Moon Sign(근사) + Rising Sign(근사)
 * 외부 라이브러리 없이 천문학 기본 공식으로 계산
 *
 * Phase 2 확장: 행성 위치, 하우스, 메이저 애스펙트
 */

import type { ZodiacSign, ZodiacInfo, WesternProfile, BirthData } from './types';
import { ZODIAC_DATA } from './constants';

// ─── Sun Sign ─────────────────────────────────────────────────────────

/**
 * 양력 날짜로 Sun Sign 결정
 * 표준 별자리 날짜 구간 기반 (실제 태양 위치와 ±1일 오차 가능)
 */
export function calcSunSign(month: number, day: number): ZodiacInfo {
  // 날짜 → 별자리 매핑 (1-indexed month)
  const ranges: { sign: ZodiacSign; startMonth: number; startDay: number }[] = [
    { sign: 'capricorn',   startMonth: 12, startDay: 22 },
    { sign: 'aquarius',    startMonth: 1,  startDay: 20 },
    { sign: 'pisces',      startMonth: 2,  startDay: 19 },
    { sign: 'aries',       startMonth: 3,  startDay: 21 },
    { sign: 'taurus',      startMonth: 4,  startDay: 20 },
    { sign: 'gemini',      startMonth: 5,  startDay: 21 },
    { sign: 'cancer',      startMonth: 6,  startDay: 21 },
    { sign: 'leo',         startMonth: 7,  startDay: 23 },
    { sign: 'virgo',       startMonth: 8,  startDay: 23 },
    { sign: 'libra',       startMonth: 9,  startDay: 23 },
    { sign: 'scorpio',     startMonth: 10, startDay: 23 },
    { sign: 'sagittarius', startMonth: 11, startDay: 22 },
  ];

  // 12월 22일 이후 → 염소자리
  if (month === 12 && day >= 22) {
    return findZodiacInfo('capricorn');
  }

  // 나머지: 역순으로 탐색하여 해당 구간 찾기
  for (let i = ranges.length - 1; i >= 0; i--) {
    const r = ranges[i];
    if (r.startMonth === 12) continue; // 이미 처리
    if (month > r.startMonth || (month === r.startMonth && day >= r.startDay)) {
      return findZodiacInfo(r.sign);
    }
  }

  // 1/1 ~ 1/19 → 염소자리
  return findZodiacInfo('capricorn');
}

// ─── Moon Sign (근사 계산) ────────────────────────────────────────────

/**
 * Moon Sign 근사 계산
 *
 * 달의 항성 주기는 약 27.32일 (황도대 1회전)
 * 기준점: 2000-01-06 18:14 UTC — 달이 게자리(Cancer) 0° 위치
 *
 * 이 근사치는 ±1~2 별자리 오차가 발생할 수 있음.
 * 정확한 계산에는 달의 타원 궤도, 교점 회귀 등이 필요하지만
 * MVP에서는 균일 이동 가정으로 충분한 근사치를 제공.
 */
export function calcMoonSign(year: number, month: number, day: number, hour: number = 12, timezone?: string): ZodiacInfo {
  // 기준 epoch: 2000-01-06 18:14 UTC (Moon in Cancer 0°)
  const epochJD = 2451550.26; // JD for 2000-01-06 18:14 UTC

  // Convert local time to UT via Date.UTC for safe month/year rollover
  const tzOffset = timezone ? getTimezoneOffsetHours(timezone, year, month, day, hour) : 0;
  const utHourRaw = hour - tzOffset;
  const utcDate = new Date(Date.UTC(year, month - 1, day, Math.floor(utHourRaw), Math.round((utHourRaw % 1) * 60)));
  const utYear = utcDate.getUTCFullYear();
  const utMonth = utcDate.getUTCMonth() + 1;
  const utDay = utcDate.getUTCDate();
  const utHour = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60;

  // 입력 날짜의 JD (using normalized UT)
  const a = Math.floor((14 - utMonth) / 12);
  const y = utYear + 4800 - a;
  const m = utMonth + 12 * a - 3;
  const jd = utDay + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045 +
    (utHour - 12) / 24;

  // 달의 항성 주기 = 27.321661일
  const SIDEREAL_MONTH = 27.321661;

  // 기준점 대비 경과일
  const daysSinceEpoch = jd - epochJD;

  // 달의 황경(ecliptic longitude) 근사
  // 기준 Cancer(3) = 90°, 30° per sign
  const degreesPerDay = 360 / SIDEREAL_MONTH; // ~13.18°/day
  const baseDegree = 90; // Cancer 0°
  const moonDegree = ((baseDegree + daysSinceEpoch * degreesPerDay) % 360 + 360) % 360;

  // 황경 → 별자리 (0°=Aries, 30°=Taurus, ...)
  const signIdx = Math.floor(moonDegree / 30) % 12;
  const signs: ZodiacSign[] = [
    'aries','taurus','gemini','cancer','leo','virgo',
    'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
  ];

  return findZodiacInfo(signs[signIdx]);
}

// ─── Rising Sign / Ascendant (근사 계산) ──────────────────────────────

/**
 * Rising Sign (Ascendant) 근사 계산
 *
 * 방법:
 * 1. 출생 시간 + 날짜 → Local Sidereal Time (LST) 계산
 * 2. LST → 황도대에서 동쪽 지평선에 떠오르는 별자리 결정
 *
 * 정확도: ±1 별자리 (정밀 계산에는 obliquity 보정 필요)
 * 출생 시간이나 위치가 없으면 null 반환
 */
export function calcRisingSign(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  longitude: number,
  timezone?: string,
): ZodiacInfo | null {
  // Step 1: Convert local time to UT via Date.UTC for safe rollover
  const tzOffset = timezone
    ? getTimezoneOffsetHours(timezone, year, month, day, hour)
    : 0; // no timezone → assume UTC
  const utHoursRaw = hour + minute / 60 - tzOffset;
  const utcDate = new Date(Date.UTC(year, month - 1, day, Math.floor(utHoursRaw), Math.round((utHoursRaw % 1) * 60)));
  const utYear = utcDate.getUTCFullYear();
  const utMonth = utcDate.getUTCMonth() + 1;
  const utDay = utcDate.getUTCDate();
  const adjUtHours = utcDate.getUTCHours() + utcDate.getUTCMinutes() / 60;

  // Step 2: Julian Day at 0h UT
  const a = Math.floor((14 - utMonth) / 12);
  const y = utYear + 4800 - a;
  const m = utMonth + 12 * a - 3;
  const jd = utDay + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;

  // Step 3: Julian centuries from J2000.0
  const T = (jd - 2451545.0) / 36525;

  // Step 4: Greenwich Mean Sidereal Time at 0h UT (in degrees)
  // Meeus formula
  const GMST0 = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T - (T * T * T) / 38710000;

  // Step 5: GMST at birth UT time (add hour angle)
  const GMST = (GMST0 + adjUtHours * 15.04107) % 360;

  // Step 6: Local Sidereal Time = GMST + longitude
  const LST = ((GMST + longitude) % 360 + 360) % 360;

  // Step 7: Ascendant ≈ LST (simplified approximation)
  // 정밀 계산: tan(ASC) = -cos(LST) / (sin(ε)*tan(φ) + cos(ε)*sin(LST))
  // 여기서는 LST 자체를 Ascendant 황경으로 근사
  const signIdx = Math.floor(LST / 30) % 12;
  const signs: ZodiacSign[] = [
    'aries','taurus','gemini','cancer','leo','virgo',
    'libra','scorpio','sagittarius','capricorn','aquarius','pisces',
  ];

  return findZodiacInfo(signs[signIdx]);
}

// ─── 통합 Western Profile 생성 ───────────────────────────────────────

/**
 * 출생 데이터로 전체 서양 점성술 프로필 생성
 */
export function calcWesternProfile(birth: BirthData): WesternProfile {
  const [year, month, day] = birth.date.split('-').map(Number);

  const sunSign = calcSunSign(month, day);
  const moonSign = calcMoonSign(year, month, day, birth.hour ?? 12, birth.location?.timezone);

  let risingSign: ZodiacInfo | null = null;
  if (birth.hour !== undefined && birth.location) {
    risingSign = calcRisingSign(
      year, month, day,
      birth.hour, birth.minute ?? 0,
      birth.location.longitude,
      birth.location.timezone,
    );
  }

  return { sunSign, moonSign, risingSign };
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────

function findZodiacInfo(sign: ZodiacSign): ZodiacInfo {
  return ZODIAC_DATA.find(z => z.sign === sign)!;
}

/**
 * IANA timezone → UTC offset in hours for a specific date.
 * Uses Intl.DateTimeFormat to handle DST correctly.
 *
 * e.g., getTimezoneOffsetHours('Asia/Seoul', 1990, 5, 15) → 9
 *       getTimezoneOffsetHours('America/New_York', 1990, 7, 4) → -4 (EDT)
 */
function getTimezoneOffsetHours(
  timezone: string,
  year: number,
  month: number,
  day: number,
  hour: number = 12,
): number {
  try {
    // Create a date at the specified local time in UTC
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));

    // Format in the target timezone to get its local representation
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', hour12: false, minute: 'numeric',
    });

    const parts = formatter.formatToParts(utcDate);
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);

    const localDate = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') === 24 ? 0 : get('hour'), get('minute')));
    if (get('hour') === 24) localDate.setUTCDate(localDate.getUTCDate() + 1);

    // Offset = local - UTC (in ms → hours)
    const diffMs = localDate.getTime() - utcDate.getTime();
    return diffMs / (60 * 60 * 1000);
  } catch {
    // Invalid timezone string — fall back to 0 (UTC)
    return 0;
  }
}
