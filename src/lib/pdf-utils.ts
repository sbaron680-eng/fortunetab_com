/**
 * FortuneTab PDF Utilities
 * 상수, 유틸 함수, drawNavBar
 */

import { getTheme, ColorTheme, DEFAULT_THEME } from './pdf-themes';

// ── 타입 정의 (pdf-generator.ts에서 re-export됨) ─────────────────────────────
export type Orientation = 'portrait' | 'landscape';
export type PageType = 'cover' | 'year-index' | 'monthly' | 'weekly' | 'daily'
  // 부록 28종
  | 'year-glance' | 'important-dates' | 'birthday-cal'
  | 'yearly-goals' | 'yearly-review' | 'vision-board'
  | 'monthly-goals' | 'one-line-day'
  | 'weekly-alt' | 'weekly-reflection' | 'meal-plan' | 'habit-tracker' | 'selfcare'
  | 'daily-alt' | 'journal' | 'gratitude'
  | 'savings' | 'budget' | 'household' | 'expense'
  | 'inspiration' | 'bucket-list' | 'travel' | 'shopping' | 'contacts'
  | 'todo' | 'notes-lined' | 'notes-grid';

export interface NavLink {
  x: number; y: number; w: number; h: number;
  targetType: PageType;
  targetIdx: number; // month 0-11 | week 1-52
}

export interface SajuData {
  ganzhi: string;
  dayElem: string;
  yongsin: string;
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
  elemSummary: string;
}

export interface PlannerOptions {
  orientation: Orientation;
  year: number;
  name: string;
  pages: PageType[];
  theme?: string;
  mode?: 'fortune' | 'practice'; // 'fortune'(기본): 사주·운세 플래너 | 'practice': 목표달성·실천 플래너
  saju?: SajuData;
  onProgress?: (current: number, total: number, label: string) => void;
  returnBlob?: boolean;  // true면 다운로드 대신 Blob 반환 (서버 사이드용)
}

// ── 캔버스 해상도 (150dpi A4) ────────────────────────────────────────────────
export const PORTRAIT_W = 1240;
export const PORTRAIT_H = 1754;

// ── 현재 테마 (generatePlannerPDF에서 설정) ──────────────────────────────────
export const themeHolder: { T: ColorTheme } = { T: DEFAULT_THEME };

// ── 고정 팔레트 (중립 색상) ──────────────────────────────────────────────────
export const C = {
  bgPage:     '#faf9f7',   // 한지 화이트 (기존: #faf5f0 핑크)
  bgCard:     '#ffffff',   // 카드 배경 (기존: #fffbf8)

  textDark:   '#111111',   // 먹물 블랙 (기존: #2a1a22 핑크계)
  textMid:    '#444444',   // 중간 텍스트 (기존: #7a5560)
  textLight:  '#888888',   // 보조 텍스트 (기존: #9a8a90)

  ruleColor:  '#e0dbd4',   // 규칙선 한지 경계 (기존: #eedde4 핑크)
  ruleFaint:  '#eeebe6',   // 흐린 규칙선 (기존: #f6eef1)

  // 공휴일/대체공휴일/기념일 (고정 — 변경 없음)
  holidayBg:      '#ffecec',
  holidayText:    '#b84060',
  substituteBg:   '#fff0e0',
  substituteText: '#b86020',
  memorialBg:     '#e8eeff',
  memorialText:   '#5060b0',

  // 커버 악센트 (테마 중립 — 병풍 한지 계열)
  gold:       '#b5282a',   // 한국 빨강 — 커버 포인트 (기존: 골드)
  goldPale:   '#c8972a',   // 커버 세부 악센트 (기존: #d8b880)
  goldFaint:  '#888888',   // 흐린 텍스트 (기존: #ecd8b0)
  goldDim:    '#aaaaaa',   // 구분선 (기존: #a88048)

  white:      '#ffffff',
  whiteSoft:  '#f5f5f5',
};

// ── 폰트 헬퍼 ────────────────────────────────────────────────────────────────
export const SERIF = '"나눔명조", "Noto Serif KR", "Nanum Myeongjo", "한국어", serif';
export const SANS  = '"Noto Sans KR", "맑은 고딕", "Apple SD Gothic Neo", sans-serif';

export function F(size: number, bold = false, serif = false): string {
  return `${bold ? 'bold ' : ''}${Math.round(size)}px ${serif ? SERIF : SANS}`;
}

// ── 네비게이션 ────────────────────────────────────────────────────────────────
export const NAV_H_RATIO = 0.028;

// ── 페이지 여백 (상하좌우 공통) ────────────────────────────────────────────────
export const PAGE_PAD = 52; // px — A4 150dpi 기준 약 4.2% (≈ 8.8mm)

export const NAV_SECTIONS: { type: PageType; label: string }[] = [
  { type: 'cover',      label: '표지' },
  { type: 'year-index', label: '연간' },
  { type: 'monthly',    label: '월간' },
  { type: 'weekly',     label: '주간' },
  { type: 'daily',      label: '일간' },
];

// ── 공통 유틸 ────────────────────────────────────────────────────────────────
export const MONTHS_KO = ['1월','2월','3월','4월','5월','6월',
                   '7월','8월','9월','10월','11월','12월'];
export const DAYS_KO   = ['일','월','화','수','목','금','토'];
export const DAYS_WEEK_SHORT = ['월','화','수','목','금','토','일']; // Mon-Sun
export const DAYS_WEEK_FULL  = ['월요일','화요일','수요일','목요일','금요일','토요일','일요일'];

export function lerpColor(
  c1: [number,number,number],
  c2: [number,number,number],
  t: number,
): string {
  const r = Math.round(c1[0] + (c2[0]-c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1]-c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2]-c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}
export function hexToRgb(hex: string): [number,number,number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
export function centeredText(ctx: CanvasRenderingContext2D, text: string, y: number, W: number) {
  ctx.fillText(text, (W - ctx.measureText(text).width) / 2, y);
}
export function firstDayOf(year: number, month: number) { return new Date(year, month, 1).getDay(); }
export function daysInMonth(year: number, month: number) { return new Date(year, month+1, 0).getDate(); }

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// ── ISO 주차 헬퍼 ─────────────────────────────────────────────────────────────
export function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7,
  );
}

// ISO 주차 N의 날짜 배열: [월, 화, 수, 목, 금, 토, 일]
export function getWeekDates(year: number, isoWeek: number): Date[] {
  const jan4 = new Date(year, 0, 4);
  const dow   = (jan4.getDay() + 6) % 7; // 0=월요일까지 거리
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dow + (isoWeek - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// ── 추상 브러시 스트로크 (서예 커버 배경) ─────────────────────────────────
export function drawBrushStrokes(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  color: string,
) {
  // [startX%, startY%, endX%, endY%, opacity, lineWidth]
  const strokes: [number, number, number, number, number, number][] = [
    [0.10, 0.18, 0.55, 0.42, 0.07, 75],
    [0.45, 0.10, 0.90, 0.35, 0.05, 65],
    [0.05, 0.55, 0.50, 0.80, 0.06, 80],
    [0.55, 0.60, 0.95, 0.85, 0.04, 60],
  ];
  const [r, g, b] = hexToRgb(color);
  for (const [sx, sy, ex, ey, op, lw] of strokes) {
    const grad = ctx.createLinearGradient(W*sx, H*sy, W*ex, H*ey);
    grad.addColorStop(0,   `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${op})`);
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
    ctx.beginPath();
    ctx.moveTo(W*sx, H*sy);
    ctx.bezierCurveTo(
      W*(sx+0.15), H*(sy-0.05),
      W*(ex-0.15), H*(ey+0.05),
      W*ex, H*ey,
    );
    ctx.lineWidth = lw;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// ── 계절 픽토그램 (커버 하단) ─────────────────────────────────────────────
export function drawSeasonPictos(
  ctx: CanvasRenderingContext2D,
  centerX: number, y: number,
  color: string, size = 36,
) {
  const gap = size * 1.8;
  const startX = centerX - gap * 1.5;
  const [r, g, b] = hexToRgb(color);

  const pictos = [
    // 봄: 매화 5꽃잎
    (cx: number, cy: number) => {
      for (let i = 0; i < 5; i++) {
        const rad = (i * 72 * Math.PI) / 180;
        const px = cx + size*0.38 * Math.sin(rad);
        const py = cy - size*0.38 * Math.cos(rad);
        ctx.beginPath();
        ctx.ellipse(px, py, size*0.18, size*0.13, rad, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${r},${g},${b},0.75)`;
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, size*0.13, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`; ctx.fill();
    },
    // 여름: 연잎 (원+방사선)
    (cx: number, cy: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, size*0.42, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, size*0.18, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`; ctx.fill();
      for (let i = 0; i < 8; i++) {
        const rad = (i * 45 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx + size*0.2*Math.cos(rad), cy + size*0.2*Math.sin(rad));
        ctx.lineTo(cx + size*0.42*Math.cos(rad), cy + size*0.42*Math.sin(rad));
        ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`; ctx.lineWidth = 1; ctx.stroke();
      }
    },
    // 가을: 보름달
    (cx: number, cy: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, size*0.45, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, size*0.45, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.7)`; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - size*0.12, cy - size*0.1, size*0.1, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`; ctx.lineWidth = 1; ctx.stroke();
    },
    // 겨울: 설화 6가지
    (cx: number, cy: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, size*0.1, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`; ctx.fill();
      for (let i = 0; i < 6; i++) {
        const rad = (i * 60 * Math.PI) / 180;
        const x2 = cx + size*0.45*Math.cos(rad), y2 = cy + size*0.45*Math.sin(rad);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`; ctx.lineWidth = 1.5; ctx.stroke();
        const bRad1 = ((i*60+30)*Math.PI)/180, bRad2 = ((i*60-30)*Math.PI)/180;
        const bx = cx + size*0.28*Math.cos(rad), by = cy + size*0.28*Math.sin(rad);
        for (const br of [bRad1, bRad2]) {
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + size*0.15*Math.cos(br), by + size*0.15*Math.sin(br));
          ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    },
  ];

  pictos.forEach((draw, i) => {
    const cx = startX + i * gap;
    ctx.beginPath(); ctx.arc(cx, y, size*0.6, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${r},${g},${b},0.08)`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, y, size*0.6, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`; ctx.lineWidth = 1; ctx.stroke();
    draw(cx, y);
  });
}

export function drawRule(
  ctx: CanvasRenderingContext2D,
  y: number, W: number, margin = 140, color = C.goldDim, diamond = true,
) {
  ctx.beginPath(); ctx.moveTo(margin, y); ctx.lineTo(W-margin, y);
  ctx.strokeStyle = color; ctx.lineWidth = 0.8; ctx.stroke();
  if (diamond) {
    const d = 5;
    ctx.beginPath();
    ctx.moveTo(W/2, y-d); ctx.lineTo(W/2+d, y);
    ctx.lineTo(W/2, y+d); ctx.lineTo(W/2-d, y);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
}

// ── 하단 네비게이션 바 ───────────────────────────────────────────────────────
export function drawNavBar(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  currentType: PageType,
  availablePages: PageType[],
) {
  const T = themeHolder.T;
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const barY  = H - NAV_H;

  const grad = ctx.createLinearGradient(0, barY, 0, H);
  grad.addColorStop(0, T.navA);
  grad.addColorStop(1, T.navB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, W, NAV_H);

  // NavBar 상단 구분선 (흰색 반투명)
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(W, barY);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const tabW     = W / NAV_SECTIONS.length;
  const fontSize = NAV_H * 0.42;

  for (let i = 0; i < NAV_SECTIONS.length; i++) {
    const { type, label } = NAV_SECTIONS[i];
    const cx       = i * tabW + tabW / 2;
    const isActive = type === currentType;
    const isAvail  = availablePages.includes(type);

    if (isActive) {
      // 현재 탭 강조: 배경 T.navA + 흰색 반투명 테두리
      ctx.fillStyle = T.navA;
      roundRect(ctx, i*tabW+3, barY+3, tabW-6, NAV_H-6, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1;
      roundRect(ctx, i*tabW+3, barY+3, tabW-6, NAV_H-6, 4);
      ctx.stroke();
    }

    ctx.font = F(fontSize, isActive);
    ctx.fillStyle = isActive
      ? '#ffffff'
      : isAvail
        ? 'rgba(255,255,255,0.75)'
        : 'rgba(255,255,255,0.30)';

    const tw = ctx.measureText(label).width;
    ctx.fillText(label, cx - tw/2, barY + NAV_H*0.68);
  }
}

