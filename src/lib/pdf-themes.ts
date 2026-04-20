/**
 * FortuneTab PDF 플래너 컬러 테마 (7종)
 *
 * v2 "New Eastern Editorial" 디자인 언어에서는 accent / accentDeep / kanji 3개 필드만 사용.
 * 기존 필드(coverDeep ~ navB)는 부록 28페이지(pdf-pages-extras.ts)가 계속 사용.
 */

export interface ColorTheme {
  id: string;
  name: string;
  emoji: string;
  swatch: string;          // UI 스와치 색상

  // v2 디자인 언어 (메인 5페이지) ────────────────────────────────
  accent: string;          // 주 악센트 (연도·섹션 번호·헤더 도트)
  accentDeep: string;      // 깊은 톤 (세로 한자·그림자)
  kanji: string;           // 테마 고유 낙관 글자

  // ↓ 기존 필드 — 부록 28페이지에서 계속 사용 ─────────────────────
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
  // ── 🌸 로즈 (핑크작약) ────────────────────────────────────────────────────
  {
    id: 'rose', name: '로즈', emoji: '🌸', swatch: '#c2567a',
    accent: '#9a3055', accentDeep: '#6a1a38', kanji: '燃',
    coverDeep: '#6a1a38', coverMid: '#c2567a', coverLight: '#f0d0dc',
    headerA: '#9a3055', headerB: '#c2567a',
    weeklyA: '#9a3055', weeklyB: '#c2567a',
    weeklyAccent: 'rgba(255,245,250,0.95)',
    dayBgSun: '#f8d4e2', dayBgSat: '#f4e8f8', dayBgMid: '#fdf8fc',
    wkDayBgSun: '#f8d4e2', wkDayBgSat: '#ede0f4', wkDayBgMid: '#f8f0fb',
    wkDayAccent: '#9a3055',
    cellBgSun: '#fde8f0', cellBgSat: '#f9f0fc',
    sundayText: '#9a3055', saturdayText: '#9a3055',
    todayCircle: '#c2567a',
    navA: '#9a3055', navB: '#6a1a38',
  },
  // ── ⚓ 네이비 (인디고) ────────────────────────────────────────────────────
  {
    id: 'navy', name: '네이비', emoji: '⚓', swatch: '#1a2a6c',
    accent: '#1a2a6c', accentDeep: '#0f1a4a', kanji: '靜',
    coverDeep: '#0f1a4a', coverMid: '#1a2a6c', coverLight: '#c8d0e8',
    headerA: '#1a2a6c', headerB: '#2a3a8c',
    weeklyA: '#1a2a6c', weeklyB: '#2a3a8c',
    weeklyAccent: 'rgba(200,220,255,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#e0e8f8', dayBgMid: '#f0f4fc',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#d4e0f4', wkDayBgMid: '#e8eef8',
    wkDayAccent: '#1a2a6c',
    cellBgSun: '#fff0f0', cellBgSat: '#eef2fc',
    sundayText: '#3a5aaa', saturdayText: '#1a2a6c',
    todayCircle: '#1a2a6c',
    navA: '#1a2a6c', navB: '#0f1a4a',
  },
  // ── 🖤 블랙 (먹물) ────────────────────────────────────────────────────────
  {
    id: 'black', name: '블랙', emoji: '🖤', swatch: '#222222',
    accent: '#222222', accentDeep: '#000000', kanji: '玄',
    coverDeep: '#111111', coverMid: '#333333', coverLight: '#cccccc',
    headerA: '#222222', headerB: '#444444',
    weeklyA: '#222222', weeklyB: '#444444',
    weeklyAccent: 'rgba(220,215,205,0.90)',
    dayBgSun: '#fde8ea', dayBgSat: '#eaeaea', dayBgMid: '#f4f4f4',
    wkDayBgSun: '#fde8ea', wkDayBgSat: '#e0e0e0', wkDayBgMid: '#ececec',
    wkDayAccent: '#333333',
    cellBgSun: '#fff0f0', cellBgSat: '#f4f4f4',
    sundayText: '#c04040', saturdayText: '#444444',
    todayCircle: '#333333',
    navA: '#222222', navB: '#111111',
  },
  // ── 💙 블루 (청화백자) ──────────────────────────────────────────────────
  {
    id: 'blue', name: '블루', emoji: '💙', swatch: '#2a5280',
    accent: '#2a5280', accentDeep: '#102040', kanji: '淸',
    coverDeep: '#102040', coverMid: '#2a5280', coverLight: '#c0d0e8',
    headerA: '#1a3a6a', headerB: '#2a5280',
    weeklyA: '#1a3a6a', weeklyB: '#2a5280',
    weeklyAccent: 'rgba(190,220,255,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eeff', dayBgMid: '#eef4ff',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#cce0ff', wkDayBgMid: '#e4f0ff',
    wkDayAccent: '#1a3a6a',
    cellBgSun: '#fff0f0', cellBgSat: '#eef6ff',
    sundayText: '#2a5280', saturdayText: '#2a5280',
    todayCircle: '#2a5280',
    navA: '#1a3a6a', navB: '#102040',
  },
  // ── 🌿 포레스트 (청자색) ────────────────────────────────────────────────
  {
    id: 'forest', name: '포레스트', emoji: '🌿', swatch: '#2a6c5a',
    accent: '#1e5040', accentDeep: '#0b2a1c', kanji: '綠',
    coverDeep: '#143a2a', coverMid: '#2a6c5a', coverLight: '#b8d8cc',
    headerA: '#1e5040', headerB: '#2a6c5a',
    weeklyA: '#1e5040', weeklyB: '#2a6c5a',
    weeklyAccent: 'rgba(230,255,240,0.95)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eedc', dayBgMid: '#eef6f0',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#cce4d0', wkDayBgMid: '#e4f0e8',
    wkDayAccent: '#1e5040',
    cellBgSun: '#fff0f0', cellBgSat: '#f0faf2',
    sundayText: '#2a6c5a', saturdayText: '#2a6c5a',
    todayCircle: '#2a6c5a',
    navA: '#1e5040', navB: '#143a2a',
  },
  // ── 🧡 오렌지 (홍살구) ──────────────────────────────────────────────────
  {
    id: 'orange', name: '오렌지', emoji: '🧡', swatch: '#d4622a',
    accent: '#b04020', accentDeep: '#6a1e08', kanji: '陽',
    coverDeep: '#8c3010', coverMid: '#d4622a', coverLight: '#f4d0b8',
    headerA: '#b04020', headerB: '#d4622a',
    weeklyA: '#b04020', weeklyB: '#d4622a',
    weeklyAccent: 'rgba(255,240,210,0.95)',
    dayBgSun: '#fad4cc', dayBgSat: '#fff0dc', dayBgMid: '#fff8f2',
    wkDayBgSun: '#fad4cc', wkDayBgSat: '#ffe4c0', wkDayBgMid: '#fff0e4',
    wkDayAccent: '#b04020',
    cellBgSun: '#fce0d8', cellBgSat: '#fff8ec',
    sundayText: '#d4622a', saturdayText: '#b04020',
    todayCircle: '#d4622a',
    navA: '#b04020', navB: '#8c3010',
  },
  // ── ✨ 골드 (한국 금색) ──────────────────────────────────────────────────
  {
    id: 'gold', name: '골드', emoji: '✨', swatch: '#c8972a',
    accent: '#a07020', accentDeep: '#5a3808', kanji: '曜',
    coverDeep: '#7a5010', coverMid: '#c8972a', coverLight: '#f0e0b0',
    headerA: '#a07020', headerB: '#c8972a',
    weeklyA: '#a07020', weeklyB: '#c8972a',
    weeklyAccent: 'rgba(255,245,210,0.95)',
    dayBgSun: '#f8d8c8', dayBgSat: '#f8eecc', dayBgMid: '#fdf8ec',
    wkDayBgSun: '#f8d8c8', wkDayBgSat: '#f4e4c0', wkDayBgMid: '#fdf0d8',
    wkDayAccent: '#a07020',
    cellBgSun: '#fae4d4', cellBgSat: '#fdf8ec',
    sundayText: '#c8972a', saturdayText: '#a07020',
    todayCircle: '#c8972a',
    navA: '#a07020', navB: '#7a5010',
  },
];

export const DEFAULT_THEME = THEMES[0]; // rose

export function getTheme(id?: string): ColorTheme {
  return THEMES.find((t) => t.id === id) ?? DEFAULT_THEME;
}
