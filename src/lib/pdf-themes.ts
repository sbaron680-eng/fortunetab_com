/**
 * FortuneTab PDF 플래너 컬러 테마 (7종)
 */

export interface ColorTheme {
  id: string;
  name: string;
  emoji: string;
  swatch: string;          // UI 스와치 색상

  // 표지 그라디언트
  coverDeep: string;
  coverMid: string;
  coverLight: string;

  // 월간/연간/일간 헤더 그라디언트 (좌→우)
  headerA: string;
  headerB: string;

  // 주간 헤더 그라디언트
  weeklyA: string;
  weeklyB: string;
  weeklyAccent: string;    // 주간 헤더 우측 텍스트 색

  // 월간 요일 헤더 배경
  dayBgSun: string;        // 일요일 칼럼
  dayBgSat: string;        // 토요일 칼럼
  dayBgMid: string;        // 평일 칼럼

  // 주간 요일 헤더 배경
  wkDayBgSun: string;
  wkDayBgSat: string;
  wkDayBgMid: string;
  wkDayAccent: string;     // 주간 평일 헤더 텍스트

  // 월간 주말 셀 배경
  cellBgSun: string;
  cellBgSat: string;

  // 날짜 텍스트 색
  sundayText: string;
  saturdayText: string;

  // 오늘 강조 원 색
  todayCircle: string;

  // 네비게이션 바 그라디언트
  navA: string;
  navB: string;
}

export const THEMES: ColorTheme[] = [
  // ── 🌸 로즈 ────────────────────────────────────────────────────────────────
  {
    id: 'rose', name: '로즈', emoji: '🌸', swatch: '#8b3f5c',
    coverDeep: '#180d13', coverMid: '#2a1520', coverLight: '#3d2030',
    headerA: '#8b3f5c', headerB: '#a85e78',
    weeklyA: '#6a5a90', weeklyB: '#8878b0',
    weeklyAccent: 'rgba(220,210,248,0.85)',
    dayBgSun: '#fce8f0', dayBgSat: '#ece8f8', dayBgMid: '#f8f4ff',
    wkDayBgSun: '#fce8f0', wkDayBgSat: '#e8e4f8', wkDayBgMid: '#ece8f8',
    wkDayAccent: '#6a5a90',
    cellBgSun: '#fff5f8', cellBgSat: '#f5f0ff',
    sundayText: '#b84060', saturdayText: '#6060b4',
    todayCircle: '#8b3f5c',
    navA: '#8b3f5c', navB: '#3d2030',
  },
  // ── ⚓ 네이비 ──────────────────────────────────────────────────────────────
  {
    id: 'navy', name: '네이비', emoji: '⚓', swatch: '#1a3870',
    coverDeep: '#06101e', coverMid: '#0f2040', coverLight: '#1a3060',
    headerA: '#1a3870', headerB: '#2a5090',
    weeklyA: '#1e4060', weeklyB: '#2a5878',
    weeklyAccent: 'rgba(192,220,248,0.85)',
    dayBgSun: '#fde8e8', dayBgSat: '#e0eaf8', dayBgMid: '#f0f4fc',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#d8e8f8', wkDayBgMid: '#e8eef8',
    wkDayAccent: '#1e4060',
    cellBgSun: '#fff0f0', cellBgSat: '#f0f4ff',
    sundayText: '#c04040', saturdayText: '#2060b0',
    todayCircle: '#1a3870',
    navA: '#1a3870', navB: '#0f2040',
  },
  // ── 🖤 블랙 ────────────────────────────────────────────────────────────────
  {
    id: 'black', name: '블랙', emoji: '🖤', swatch: '#2a2a2a',
    coverDeep: '#080808', coverMid: '#161616', coverLight: '#242424',
    headerA: '#282828', headerB: '#484848',
    weeklyA: '#303040', weeklyB: '#484858',
    weeklyAccent: 'rgba(220,210,190,0.85)',
    dayBgSun: '#fde8ea', dayBgSat: '#e8e4f4', dayBgMid: '#f0f0f0',
    wkDayBgSun: '#fde8ea', wkDayBgSat: '#e4e0f0', wkDayBgMid: '#e8e8e8',
    wkDayAccent: '#303040',
    cellBgSun: '#fff0f0', cellBgSat: '#f0f0f8',
    sundayText: '#c04040', saturdayText: '#5050a0',
    todayCircle: '#333333',
    navA: '#282828', navB: '#141414',
  },
  // ── 💙 블루 ────────────────────────────────────────────────────────────────
  {
    id: 'blue', name: '블루', emoji: '💙', swatch: '#1870b8',
    coverDeep: '#0a1826', coverMid: '#142840', coverLight: '#1e3860',
    headerA: '#1870b8', headerB: '#28a0d8',
    weeklyA: '#2060a8', weeklyB: '#3078c0',
    weeklyAccent: 'rgba(180,220,255,0.85)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eeff', dayBgMid: '#eef6ff',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#c8e4ff', wkDayBgMid: '#e0f0ff',
    wkDayAccent: '#2060a8',
    cellBgSun: '#fff0f0', cellBgSat: '#eef8ff',
    sundayText: '#c04040', saturdayText: '#1860b0',
    todayCircle: '#1870b8',
    navA: '#1870b8', navB: '#142840',
  },
  // ── 🌿 포레스트 ─────────────────────────────────────────────────────────────
  {
    id: 'forest', name: '포레스트', emoji: '🌿', swatch: '#2d6040',
    coverDeep: '#0a1810', coverMid: '#142818', coverLight: '#1e3822',
    headerA: '#2d6040', headerB: '#3d7852',
    weeklyA: '#305038', weeklyB: '#406850',
    weeklyAccent: 'rgba(180,225,185,0.85)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eedc', dayBgMid: '#eef6f0',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#c8e4cc', wkDayBgMid: '#dfeee2',
    wkDayAccent: '#305038',
    cellBgSun: '#fff0f0', cellBgSat: '#f0faf2',
    sundayText: '#c04040', saturdayText: '#2d6040',
    todayCircle: '#2d6040',
    navA: '#2d6040', navB: '#1e3822',
  },
  // ── 🧡 오렌지 ──────────────────────────────────────────────────────────────
  {
    id: 'orange', name: '오렌지', emoji: '🧡', swatch: '#c06020',
    coverDeep: '#180a04', coverMid: '#2e160a', coverLight: '#3e2414',
    headerA: '#c06020', headerB: '#d87830',
    weeklyA: '#a04820', weeklyB: '#b86030',
    weeklyAccent: 'rgba(255,210,160,0.85)',
    dayBgSun: '#fde8e8', dayBgSat: '#fff0dc', dayBgMid: '#fff8f0',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#ffe4c0', wkDayBgMid: '#fff0e0',
    wkDayAccent: '#a04820',
    cellBgSun: '#fff0f0', cellBgSat: '#fff8ec',
    sundayText: '#c04040', saturdayText: '#a06020',
    todayCircle: '#c06020',
    navA: '#c06020', navB: '#3e2414',
  },
  // ── ✨ 골드 ────────────────────────────────────────────────────────────────
  {
    id: 'gold', name: '골드', emoji: '✨', swatch: '#b89030',
    coverDeep: '#100c04', coverMid: '#1e180a', coverLight: '#2c2412',
    headerA: '#9a7a20', headerB: '#b89030',
    weeklyA: '#806020', weeklyB: '#a07830',
    weeklyAccent: 'rgba(245,215,140,0.85)',
    dayBgSun: '#fde8e8', dayBgSat: '#f8eecc', dayBgMid: '#fdf8ec',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#f4e4c0', wkDayBgMid: '#fdf0d8',
    wkDayAccent: '#806020',
    cellBgSun: '#fff0f0', cellBgSat: '#fdf8ec',
    sundayText: '#c04040', saturdayText: '#8a6820',
    todayCircle: '#9a7a20',
    navA: '#9a7a20', navB: '#2c2412',
  },
];

export const DEFAULT_THEME = THEMES[0]; // rose

export function getTheme(id?: string): ColorTheme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}
