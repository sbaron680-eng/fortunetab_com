/**
 * FortuneTab Client-side PDF Generator v4
 * Canvas 2D API → jsPDF · 브라우저 전용
 *
 * v4 신기능:
 *   - 7가지 컬러 테마 (로즈/네이비/블랙/블루/포레스트/오렌지/골드)
 *   - 주간: ISO 주차 기반 실제 날짜 표시 (월~일 순서)
 *   - 월간/주간: 공휴일·기념일 셀 색상 표시
 *   - 연간 인덱스 → 월간 / 월간 → 주간 내부 하이퍼링크
 */

import { getHoliday, getSolarTerm } from './korean-holidays';
import { getTheme, ColorTheme, DEFAULT_THEME } from './pdf-themes';

export type Orientation = 'portrait' | 'landscape';
export type PageType = 'cover' | 'year-index' | 'monthly' | 'weekly' | 'daily';

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
  saju?: SajuData;
  onProgress?: (current: number, total: number, label: string) => void;
}

// ── 캔버스 해상도 (150dpi A4) ────────────────────────────────────────────────
const PORTRAIT_W = 1240;
const PORTRAIT_H = 1754;

// ── 현재 테마 (generatePlannerPDF에서 설정) ──────────────────────────────────
let T: ColorTheme = DEFAULT_THEME;

// ── 고정 팔레트 (중립 색상) ──────────────────────────────────────────────────
const C = {
  bgPage:     '#faf5f0',
  bgCard:     '#fffbf8',

  textDark:   '#2a1a22',
  textMid:    '#7a5560',
  textLight:  '#b898a4',

  ruleColor:  '#eedde4',
  ruleFaint:  '#f6eef1',

  // 공휴일/대체공휴일/기념일 (고정)
  holidayBg:      '#ffecec',
  holidayText:    '#b84060',
  substituteBg:   '#fff0e0',
  substituteText: '#b86020',
  memorialBg:     '#e8eeff',
  memorialText:   '#5060b0',

  // 표지 골드/크림
  gold:       '#c8a060',
  goldPale:   '#d8b880',
  goldFaint:  '#ecd8b0',
  goldDim:    '#a88048',

  white:      '#ffffff',
  whiteSoft:  '#fff5f8',
};

// ── 폰트 헬퍼 ────────────────────────────────────────────────────────────────
const SERIF = '"Noto Serif KR", "나눔명조", serif';
const SANS  = '"Noto Sans KR", "맑은 고딕", "Apple SD Gothic Neo", sans-serif';

function F(size: number, bold = false, serif = false): string {
  return `${bold ? 'bold ' : ''}${Math.round(size)}px ${serif ? SERIF : SANS}`;
}

// ── 네비게이션 ────────────────────────────────────────────────────────────────
const NAV_H_RATIO = 0.028;

const NAV_SECTIONS: { type: PageType; label: string }[] = [
  { type: 'cover',      label: '표지' },
  { type: 'year-index', label: '연간' },
  { type: 'monthly',    label: '월간' },
  { type: 'weekly',     label: '주간' },
  { type: 'daily',      label: '일간' },
];

// ── 공통 유틸 ────────────────────────────────────────────────────────────────
const MONTHS_KO = ['1월','2월','3월','4월','5월','6월',
                   '7월','8월','9월','10월','11월','12월'];
const DAYS_KO   = ['일','월','화','수','목','금','토'];
const DAYS_WEEK_SHORT = ['월','화','수','목','금','토','일']; // Mon-Sun
const DAYS_WEEK_FULL  = ['월요일','화요일','수요일','목요일','금요일','토요일','일요일'];

function lerpColor(
  c1: [number,number,number],
  c2: [number,number,number],
  t: number,
): string {
  const r = Math.round(c1[0] + (c2[0]-c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1]-c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2]-c1[2]) * t);
  return `rgb(${r},${g},${b})`;
}
function hexToRgb(hex: string): [number,number,number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function centeredText(ctx: CanvasRenderingContext2D, text: string, y: number, W: number) {
  ctx.fillText(text, (W - ctx.measureText(text).width) / 2, y);
}
function firstDayOf(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function daysInMonth(year: number, month: number) { return new Date(year, month+1, 0).getDate(); }

function roundRect(
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
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(
    ((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7,
  );
}

// ISO 주차 N의 날짜 배열: [월, 화, 수, 목, 금, 토, 일]
function getWeekDates(year: number, isoWeek: number): Date[] {
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

// ── 장식 요소 ────────────────────────────────────────────────────────────────
function drawStars(ctx: CanvasRenderingContext2D, W: number, H: number, seed = 2026) {
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
  for (let i = 0; i < 200; i++) {
    const x = rng() * W;
    const y = rng() * (H * 0.85);
    const r = rng() > 0.85 ? 2 : rng() > 0.7 ? 1 : 0.5;
    const br = 55 + rng() * 130;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.round(br+20)},${Math.round(br)},${Math.round(br+15)},0.9)`;
    ctx.fill();
  }
  const bright: [number,number][] = [
    [W*0.13, H*0.12], [W*0.87, H*0.10], [W*0.18, H*0.33],
    [W*0.82, H*0.28], [W*0.06, H*0.51], [W*0.92, H*0.49],
  ];
  for (const [bx, by] of bright) {
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,235,245,0.95)'; ctx.fill();
    for (const [dx, dy] of [[0,-10],[0,10],[-10,0],[10,0]] as [number,number][]) {
      ctx.beginPath(); ctx.arc(bx+dx, by+dy, 1, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(220,180,205,0.6)'; ctx.fill();
    }
  }
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number, bgColor: string,
) {
  const glow = ctx.createRadialGradient(cx, cy, r*0.8, cx, cy, r*1.6);
  glow.addColorStop(0, 'rgba(200,100,140,0.22)');
  glow.addColorStop(1, 'rgba(200,100,140,0)');
  ctx.beginPath(); ctx.arc(cx, cy, r*1.6, 0, Math.PI*2);
  ctx.fillStyle = glow; ctx.fill();

  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fillStyle = C.goldPale; ctx.fill();

  ctx.beginPath(); ctx.arc(cx + r*0.47, cy - r*0.06, r*0.83, 0, Math.PI*2);
  ctx.fillStyle = bgColor; ctx.fill();
}

function drawRule(
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
function drawNavBar(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  currentType: PageType,
  availablePages: PageType[],
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const barY  = H - NAV_H;

  const grad = ctx.createLinearGradient(0, barY, 0, H);
  grad.addColorStop(0, T.navA);
  grad.addColorStop(1, T.navB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, W, NAV_H);

  // NavBar 상단 골드 구분선 (Task 4-1)
  ctx.beginPath();
  ctx.moveTo(0, barY);
  ctx.lineTo(W, barY);
  ctx.strokeStyle = 'rgba(240,192,64,0.25)';
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
      // 현재 탭 강조: 배경 T.navA + 골드 테두리 (Task 4-2)
      ctx.fillStyle = T.navA;
      roundRect(ctx, i*tabW+3, barY+3, tabW-6, NAV_H-6, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(240,192,64,0.55)';
      ctx.lineWidth = 1;
      roundRect(ctx, i*tabW+3, barY+3, tabW-6, NAV_H-6, 4);
      ctx.stroke();
    }

    ctx.font = F(fontSize, isActive);
    ctx.fillStyle = isActive
      ? C.gold
      : isAvail
        ? 'rgba(255,215,230,0.85)'
        : 'rgba(200,155,175,0.45)';

    const tw = ctx.measureText(label).width;
    ctx.fillText(label, cx - tw/2, barY + NAV_H*0.68);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE DRAWERS
// ════════════════════════════════════════════════════════════════════════════

function drawCover(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  if (!isL) {
    // 세로형: 방사형 그라디언트
    const radGrad = ctx.createRadialGradient(W/2, CH*0.28, 0, W/2, CH*0.28, CH*0.85);
    radGrad.addColorStop(0, T.coverMid);
    radGrad.addColorStop(0.45, T.coverDeep);
    radGrad.addColorStop(1, '#060510');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, W, CH);
  } else {
    // 가로형: 기존 선형 그라디언트
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, T.coverDeep);
    grad.addColorStop(0.55, T.coverMid);
    grad.addColorStop(1, T.coverLight);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, CH);
  }
  drawStars(ctx, W, CH);

  if (!isL) {
    const MX = W / 2;
    const MY = CH * 0.19;
    const bgMid = lerpColor(hexToRgb(T.coverDeep), hexToRgb(T.coverMid), MY / CH);
    drawMoon(ctx, MX, MY, W * 0.085, bgMid);

    // 달 주위 골드 원형 프레임 (Task 2-2)
    const fcx = W/2, fcy = CH * 0.19;
    const fr1 = W * 0.16, fr2 = W * 0.175;
    ctx.beginPath(); ctx.arc(fcx, fcy, fr2, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(240,192,64,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(fcx, fcy, fr1, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(240,192,64,0.10)'; ctx.lineWidth = 1; ctx.stroke();

    // 별자리 장식 (Task 2-3)
    const constLeft: [number, number][] = [
      [W*0.06, CH*0.09], [W*0.12, CH*0.06], [W*0.09, CH*0.14],
      [W*0.16, CH*0.11], [W*0.14, CH*0.18],
    ];
    const constRight: [number, number][] = [
      [W*0.84, CH*0.07], [W*0.90, CH*0.05], [W*0.88, CH*0.13],
      [W*0.94, CH*0.10], [W*0.92, CH*0.17],
    ];
    ctx.strokeStyle = 'rgba(240,192,64,0.15)'; ctx.lineWidth = 0.8;
    for (const pts of [constLeft, constRight]) {
      ctx.beginPath();
      pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
      ctx.stroke();
      ctx.fillStyle = 'rgba(240,192,64,0.6)';
      pts.forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI*2); ctx.fill();
      });
    }

    ctx.font = F(26, false, false); ctx.fillStyle = C.goldFaint;
    centeredText(ctx, 'fortunetab', CH * 0.33, W);

    drawRule(ctx, CH * 0.355, W, 150, C.goldDim, false);

    // 연도 텍스트 letterSpacing 적용 (Task 2-4)
    const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0.06em';
    ctx.font = F(W * 0.148, true, true); ctx.fillStyle = C.gold;
    centeredText(ctx, String(opts.year), CH * 0.535, W);
    if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0em';

    drawRule(ctx, CH * 0.563, W, 150, C.goldDim, true);

    ctx.font = F(44, true, true); ctx.fillStyle = C.white;
    centeredText(ctx, '나만의 365일 플래너', CH * 0.625, W);

    ctx.font = F(23, false, false); ctx.fillStyle = 'rgba(230,200,215,0.85)';
    centeredText(ctx, `사주로 읽는 ${opts.year}년 운세 일력`, CH * 0.675, W);

    const FX     = (W - 480) / 2;
    const LBLY   = CH * 0.768;
    const LINE_Y = CH * 0.808;

    ctx.font = F(18, false, false); ctx.fillStyle = C.goldFaint;
    ctx.fillText('이름', FX, LBLY);

    ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX+480, LINE_Y);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX, LINE_Y-7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FX+480, LINE_Y); ctx.lineTo(FX+480, LINE_Y-7); ctx.stroke();

    if (opts.name) {
      ctx.font = F(28, true, true); ctx.fillStyle = C.white;
      ctx.fillText(opts.name, FX+8, LINE_Y - 6);
    }

    if (opts.saju) {
      const s  = opts.saju;
      const SX = (W - 480) / 2;
      const SY = CH * 0.838;

      ctx.fillStyle = 'rgba(180,90,130,0.15)';
      roundRect(ctx, SX, SY, 480, 84, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(180,90,130,0.35)'; ctx.lineWidth = 1;
      roundRect(ctx, SX, SY, 480, 84, 8); ctx.stroke();

      ctx.font = F(13, false, false); ctx.fillStyle = C.goldFaint;
      centeredText(ctx, '사주팔자', SY + 17, W);
      ctx.font = F(17, true, true); ctx.fillStyle = C.white;
      centeredText(ctx, `${s.yearPillar}년  ${s.monthPillar}월  ${s.dayPillar}일  ${s.hourPillar}시`, SY + 43, W);
      ctx.font = F(12, false, false); ctx.fillStyle = C.goldDim;
      centeredText(ctx, `일간 ${s.dayElem} · 용신 ${s.yongsin} · ${s.elemSummary}`, SY + 66, W);
    }

    const tagY = opts.saju ? CH * 0.955 : CH * 0.930;
    drawRule(ctx, tagY - CH*0.016, W, 200, C.goldDim, false);
    ctx.font = F(15, false, false); ctx.fillStyle = C.goldDim;
    centeredText(ctx, `✦  FORTUNE TAB  ✦  ${opts.year}  ✦`, tagY, W);

  } else {
    const MX = W * 0.26, MY = CH * 0.5;
    const bgMid = lerpColor(hexToRgb(T.coverDeep), hexToRgb(T.coverMid), 0.5);
    drawMoon(ctx, MX, MY, CH * 0.22, bgMid);

    ctx.beginPath(); ctx.moveTo(W*0.5, CH*0.08); ctx.lineTo(W*0.5, CH*0.92);
    ctx.strokeStyle = 'rgba(180,90,130,0.25)'; ctx.lineWidth = 1; ctx.stroke();

    const RX = W*0.5, RW = W*0.5;

    ctx.font = F(32, false, false); ctx.fillStyle = C.goldFaint;
    const bw = ctx.measureText('fortunetab').width;
    ctx.fillText('fortunetab', RX+(RW-bw)/2, CH*0.295);

    drawRule(ctx, CH*0.355, W, W*0.52, C.goldDim, false);

    ctx.font = F(CH*0.27, true, true); ctx.fillStyle = C.gold;
    const yw = ctx.measureText(String(opts.year)).width;
    ctx.fillText(String(opts.year), RX+(RW-yw)/2, CH*0.645);

    drawRule(ctx, CH*0.695, W, W*0.52, C.goldDim, true);

    ctx.font = F(28, true, true); ctx.fillStyle = C.white;
    const tw = ctx.measureText('사주·운세로 설계한 나만의 플래너').width;
    ctx.fillText('사주·운세로 설계한 나만의 플래너', RX+(RW-tw)/2, CH*0.788);

    const FX2 = RX + RW*0.14, FW2 = RW*0.72;
    ctx.font = F(20, false, false); ctx.fillStyle = C.goldFaint;
    ctx.fillText('이름', FX2, CH*0.875);
    ctx.beginPath(); ctx.moveTo(FX2, CH*0.915); ctx.lineTo(FX2+FW2, CH*0.915);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.stroke();
    if (opts.name) {
      ctx.font = F(26, true, true); ctx.fillStyle = C.white;
      ctx.fillText(opts.name, FX2+8, CH*0.910);
    }
  }

  drawNavBar(ctx, W, H, 'cover', opts.pages);
}


function drawYearIndex(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
): NavLink[] {
  const navLinks: NavLink[] = [];
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.060);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.headerA); hg.addColorStop(1, T.headerB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  const FONT_YEAR  = BAR_H * 0.52;
  const FONT_TITLE = BAR_H * 0.29;
  const TEXT_Y     = BAR_H * 0.67;

  ctx.font = F(FONT_YEAR, true, true); ctx.fillStyle = C.goldFaint;
  ctx.fillText(String(opts.year), 40, TEXT_Y);
  const yearW = ctx.measureText(String(opts.year)).width;

  ctx.font = F(FONT_TITLE, false, false);
  ctx.fillStyle = 'rgba(255,230,240,0.75)';
  ctx.fillText('연간 인덱스', 40 + yearW + 16, TEXT_Y - FONT_TITLE*0.05);

  // 12달 그리드
  const COLS   = isL ? 4 : 3;
  const ROWS   = isL ? 3 : 4;
  const PAD    = isL ? 20 : 16;
  const GX     = PAD;
  const GY     = BAR_H + (isL ? 18 : 14);
  const CW_    = (W - PAD*(COLS+1)) / COLS;
  const CELL_H = (CH - GY - (isL ? 12 : 10)) / ROWS;

  const FM  = Math.min(CW_*0.18, isL ? CH*0.046 : CH*0.027);
  const FDH = Math.min(CW_*0.095, isL ? CH*0.022 : CH*0.015);
  const FDN = Math.min(CW_*0.085, isL ? CH*0.020 : CH*0.014);

  for (let m = 0; m < 12; m++) {
    const col = m % COLS;
    const row = Math.floor(m / COLS);
    const cx2 = GX + col*(CW_+PAD);
    const cy2 = GY + row*(CELL_H+(isL?10:8));

    // NavLink: 이 셀 클릭 → 해당 월 페이지
    navLinks.push({ x: cx2, y: cy2, w: CW_, h: CELL_H, targetType: 'monthly', targetIdx: m });

    // 카드 배경
    ctx.fillStyle = C.bgCard;
    roundRect(ctx, cx2, cy2, CW_, CELL_H, 8); ctx.fill();
    ctx.strokeStyle = T.dayBgSun.replace(')', ',0.6)').replace('rgb', 'rgba');
    ctx.strokeStyle = '#f0d0da';
    ctx.lineWidth = 1;
    roundRect(ctx, cx2, cy2, CW_, CELL_H, 8); ctx.stroke();

    // 월 헤더
    const MH = FM * 1.7;
    const mg = ctx.createLinearGradient(cx2, cy2, cx2+CW_, cy2);
    mg.addColorStop(0, T.headerA); mg.addColorStop(1, T.headerB);
    ctx.fillStyle = mg;
    roundRect(ctx, cx2, cy2, CW_, MH, 8); ctx.fill();
    ctx.fillRect(cx2, cy2+MH/2, CW_, MH/2);

    ctx.font = F(FM, true, true); ctx.fillStyle = C.goldFaint;
    const mw = ctx.measureText(MONTHS_KO[m]).width;
    ctx.fillText(MONTHS_KO[m], cx2+(CW_-mw)/2, cy2+FM*1.25);

    // 요일 헤더
    const HDRY  = cy2 + MH + 5;
    const CELLW = (CW_-8) / 7;
    const DAY_CLR = [T.sundayText, C.textDark, C.textDark, C.textDark, C.textDark, C.textDark, T.saturdayText];

    for (let d = 0; d < 7; d++) {
      ctx.font = F(FDH, true, false); ctx.fillStyle = DAY_CLR[d];
      const dw = ctx.measureText(DAYS_KO[d]).width;
      ctx.fillText(DAYS_KO[d], cx2+4+d*CELLW+(CELLW-dw)/2, HDRY+FDH);
    }

    // 날짜
    const first = firstDayOf(opts.year, m);
    const days  = daysInMonth(opts.year, m);
    const NUMY  = HDRY + FDH * 2.1;
    const ROWH  = (CELL_H - (NUMY - cy2) - 4) / 6;

    for (let d = 1; d <= days; d++) {
      const dow = (first + d-1) % 7;
      const wr  = Math.floor((first + d-1) / 7);
      const nx  = cx2+4 + dow*CELLW + CELLW/2;
      const ny  = NUMY + wr*ROWH + ROWH*0.65;

      const hol = getHoliday(opts.year, m, d);
      ctx.font = F(FDN, false, false);
      if (hol?.type === 'holiday' || hol?.type === 'substitute') {
        ctx.fillStyle = C.holidayText;
      } else if (hol?.type === 'memorial') {
        ctx.fillStyle = C.memorialText;
      } else {
        ctx.fillStyle = dow===0 ? T.sundayText : dow===6 ? T.saturdayText : C.textDark;
      }
      ctx.fillText(String(d), nx - ctx.measureText(String(d)).width/2, ny);
    }
  }

  drawNavBar(ctx, W, H, 'year-index', opts.pages);
  return navLinks;
}


function drawMonthly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  monthIdx: number,
): NavLink[] {
  const navLinks: NavLink[] = [];
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (테마 컬러)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.058);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.headerA); hg.addColorStop(1, T.headerB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.55, true, true); ctx.fillStyle = C.goldFaint;
  ctx.fillText(MONTHS_KO[monthIdx], 40, BAR_H*0.70);
  const mw = ctx.measureText(MONTHS_KO[monthIdx]).width;
  ctx.font = F(BAR_H*0.28, false, false);
  ctx.fillStyle = 'rgba(255,225,235,0.75)';
  ctx.fillText(String(opts.year), 40 + mw + 14, BAR_H*0.67);

  // 요일 헤더
  const PAD    = 12;
  const GX     = PAD;
  const GY     = BAR_H + (isL ? 10 : 8);
  const CELL_W = (W - PAD*2) / 7;
  const DAY_H  = isL ? CH*0.052 : CH*0.037;

  const DAY_BG  = [T.dayBgSun, T.dayBgMid, T.dayBgMid, T.dayBgMid, T.dayBgMid, T.dayBgMid, T.dayBgSat];
  const DAY_COL = [T.sundayText, C.textDark, C.textDark, C.textDark, C.textDark, C.textDark, T.saturdayText];

  for (let d = 0; d < 7; d++) {
    ctx.fillStyle = DAY_BG[d];
    ctx.fillRect(GX + d*CELL_W, GY, CELL_W-1, DAY_H);
    ctx.font = F(DAY_H*0.46, true, false); ctx.fillStyle = DAY_COL[d];
    const dw = ctx.measureText(DAYS_KO[d]).width;
    ctx.fillText(DAYS_KO[d], GX + d*CELL_W + (CELL_W-dw)/2, GY + DAY_H*0.70);
  }

  // 날짜 셀
  const CELL_Y = GY + DAY_H + 2;
  const CELL_H = (CH - CELL_Y - PAD) / 6;
  const first  = firstDayOf(opts.year, monthIdx);
  const days   = daysInMonth(opts.year, monthIdx);
  const NF     = Math.min(CELL_H*0.24, CELL_W*0.20, 20);
  const HF     = NF * 0.58; // 공휴일 이름 폰트
  const today  = new Date();

  for (let row = 0; row < 6; row++) {
    // 이 행의 수요일(col 3)로 ISO 주차 판단
    const wedDayNum = row*7 + 3 - first + 1;
    if (wedDayNum >= 1 && wedDayNum <= days) {
      const wed     = new Date(opts.year, monthIdx, wedDayNum);
      const isoWeek = getISOWeek(wed);
      navLinks.push({
        x: GX, y: CELL_Y + row*CELL_H,
        w: W - PAD*2, h: CELL_H,
        targetType: 'weekly', targetIdx: isoWeek,
      });
    }

    for (let col = 0; col < 7; col++) {
      const dayNum = row*7 + col - first + 1;
      const cx2    = GX + col*CELL_W;
      const cy2    = CELL_Y + row*CELL_H;

      // 기본 셀 배경
      let cellBg = (col===0) ? T.cellBgSun : (col===6) ? T.cellBgSat : C.bgCard;

      if (dayNum >= 1 && dayNum <= days) {
        const hol = getHoliday(opts.year, monthIdx, dayNum);
        if (hol?.type === 'holiday' || hol?.type === 'substitute') {
          cellBg = C.holidayBg;
        } else if (hol?.type === 'memorial') {
          cellBg = C.memorialBg;
        }

        ctx.fillStyle = cellBg;
        ctx.fillRect(cx2, cy2, CELL_W-1, CELL_H-1);
        ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
        ctx.strokeRect(cx2, cy2, CELL_W-1, CELL_H-1);

        const isToday = (
          today.getFullYear() === opts.year &&
          today.getMonth() === monthIdx &&
          today.getDate() === dayNum
        );

        if (isToday) {
          ctx.beginPath(); ctx.arc(cx2+NF, cy2+NF*1.1, NF*0.88, 0, Math.PI*2);
          ctx.fillStyle = T.todayCircle; ctx.fill();
          ctx.font = F(NF, true, false); ctx.fillStyle = C.goldFaint;
        } else {
          ctx.font = F(NF, true, false);
          if (hol?.type === 'holiday' || hol?.type === 'substitute') {
            ctx.fillStyle = C.holidayText;
          } else if (hol?.type === 'memorial') {
            ctx.fillStyle = C.memorialText;
          } else {
            ctx.fillStyle = col===0 ? T.sundayText : col===6 ? T.saturdayText : C.textDark;
          }
        }
        ctx.fillText(String(dayNum), cx2 + NF*0.30, cy2 + NF*1.35);

        // 공휴일 이름 (소형 텍스트)
        if (hol && !isToday) {
          ctx.font = F(HF, false, false);
          ctx.fillStyle = hol.type === 'memorial' ? C.memorialText : C.holidayText;
          const hname = hol.name.length > 6 ? hol.name.slice(0, 5) + '…' : hol.name;
          ctx.fillText(hname, cx2 + 3, cy2 + NF*1.35 + HF*1.3);
        }

        // 절기 표시 (Task 3-2) — 셀 우상단 소형 텍스트
        const term = getSolarTerm(opts.year, monthIdx, dayNum);
        if (term) {
          ctx.font = F(9, false, false);
          ctx.fillStyle = 'rgba(100,180,100,0.85)';
          const termW = ctx.measureText(term.name).width;
          ctx.fillText(term.name, cx2 + CELL_W - termW - 3, cy2 + 10);
        }
      } else {
        ctx.fillStyle = cellBg;
        ctx.fillRect(cx2, cy2, CELL_W-1, CELL_H-1);
        ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
        ctx.strokeRect(cx2, cy2, CELL_W-1, CELL_H-1);
      }
    }
  }

  drawNavBar(ctx, W, H, 'monthly', opts.pages);
  return navLinks;
}


function drawWeekly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  weekNum: number,
): void {
  const weekDates = getWeekDates(opts.year, weekNum);
  const mon = weekDates[0]; // Monday
  const sun = weekDates[6]; // Sunday
  const fmtMD = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`;

  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (테마 secondary/weekly 컬러)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.weeklyA); hg.addColorStop(1, T.weeklyB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.52, true, true); ctx.fillStyle = C.goldFaint;
  ctx.fillText(`${opts.year}년 ${weekNum}주차`, 40, BAR_H*0.70);
  ctx.font = F(BAR_H*0.27, false, false); ctx.fillStyle = T.weeklyAccent;
  ctx.fillText(`${fmtMD(mon)} ~ ${fmtMD(sun)}`, W-200, BAR_H*0.68);

  // 이번 주 목표 (세로 전용)
  const PAD = 14;
  let CONTENT_Y = BAR_H + PAD;

  if (!isL) {
    const GOAL_H = CH * 0.058;
    ctx.fillStyle = T.wkDayBgMid; ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 1;
    ctx.fillRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.strokeRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.font = F(GOAL_H*0.34, true, false); ctx.fillStyle = T.weeklyA;
    ctx.fillText('이번 주 목표', PAD+10, CONTENT_Y+GOAL_H*0.66);
    ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD+96, CONTENT_Y); ctx.lineTo(PAD+96, CONTENT_Y+GOAL_H);
    ctx.stroke();
    CONTENT_Y += GOAL_H + PAD;
  }

  // 요일 헤더 (월~일 순서, 실제 날짜 표시)
  const COLS      = 7;
  const COL_W     = (W - PAD*2) / COLS;
  const CONTENT_H = CH - CONTENT_Y - PAD;
  const DAY_H     = isL ? CONTENT_H*0.14 : CONTENT_H*0.12;
  const FONT_DY   = DAY_H * 0.36; // 요일명: 크게 (Task 4-3)
  const FONT_DT   = DAY_H * 0.26; // 날짜 숫자: 작게 (Task 4-3)

  for (let d = 0; d < 7; d++) {
    const wdate  = weekDates[d]; // d=0 → Mon, d=5 → Sat, d=6 → Sun
    const isSat  = d === 5;
    const isSun  = d === 6;
    const hol    = getHoliday(wdate.getFullYear(), wdate.getMonth(), wdate.getDate());
    const isRed  = isSun || hol?.type === 'holiday' || hol?.type === 'substitute';
    const isMem  = hol?.type === 'memorial';

    let bgColor = isSun ? T.wkDayBgSun : isSat ? T.wkDayBgSat : T.wkDayBgMid;
    if (isRed && !isSun) bgColor = C.holidayBg;
    else if (isMem) bgColor = C.memorialBg;

    const fgColor = isRed ? C.holidayText : isMem ? C.memorialText
      : isSat ? T.saturdayText : T.wkDayAccent;
    const dateFgColor = isRed ? C.holidayText : isMem ? C.memorialText
      : isSat ? T.saturdayText : C.textMid;

    ctx.fillStyle = bgColor;
    ctx.fillRect(PAD + d*COL_W, CONTENT_Y, COL_W-1, DAY_H);

    const dayStr  = isL ? DAYS_WEEK_FULL[d] : DAYS_WEEK_SHORT[d];
    // 날짜: 일(day)만 크게, 월은 위에 작게 (Task 4-3)
    const dayOfMonth = String(wdate.getDate());
    const monthStr   = `${wdate.getMonth()+1}월`;

    // 요일명 (크게, 굵게) — 상단 절반
    ctx.font = F(FONT_DY, true, false); ctx.fillStyle = fgColor;
    const dyw = ctx.measureText(dayStr).width;
    ctx.fillText(dayStr, PAD + d*COL_W + (COL_W-dyw)/2, CONTENT_Y + DAY_H*0.44);

    // 날짜 (작게) — 하단 절반: "M월 D" 형식
    const dateDisplayStr = isL
      ? `${wdate.getMonth()+1}/${wdate.getDate()}`
      : dayOfMonth;
    ctx.font = F(FONT_DT, false, false); ctx.fillStyle = dateFgColor;
    const dtw = ctx.measureText(dateDisplayStr).width;
    ctx.fillText(dateDisplayStr, PAD + d*COL_W + (COL_W-dtw)/2, CONTENT_Y + DAY_H*0.82);

    // 세로형에서 월 표시 (작은 텍스트로 날짜 위에)
    if (!isL) {
      ctx.font = F(FONT_DT * 0.85, false, false); ctx.fillStyle = dateFgColor;
      const mw2 = ctx.measureText(monthStr).width;
      ctx.fillText(monthStr, PAD + d*COL_W + (COL_W-mw2)/2, CONTENT_Y + DAY_H*0.72);
    }

    // 공휴일명 (landscape에서만 표시)
    if (isL && hol) {
      ctx.font = F(FONT_DT * 0.80, false, false);
      ctx.fillStyle = isRed ? C.holidayText : C.memorialText;
      const hn = hol.name.length > 5 ? hol.name.slice(0, 4) + '…' : hol.name;
      const hw = ctx.measureText(hn).width;
      ctx.fillText(hn, PAD + d*COL_W + (COL_W-hw)/2, CONTENT_Y + DAY_H*0.95);
    }
  }

  // 가로줄
  const LINES_START = CONTENT_Y + DAY_H + 1;
  const LINES_H     = CH - LINES_START - PAD;
  const LINE_COUNT  = isL ? 18 : 22;
  const LINE_H      = LINES_H / LINE_COUNT;

  for (let row = 0; row < LINE_COUNT; row++) {
    const ly = LINES_START + row*LINE_H;
    ctx.strokeStyle = row%2===0 ? C.ruleColor : C.ruleFaint;
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD, ly); ctx.lineTo(W-PAD, ly); ctx.stroke();
  }

  // 세로 컬럼 구분선
  for (let d = 1; d < 7; d++) {
    ctx.strokeStyle = T.weeklyB + '60';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(PAD + d*COL_W, CONTENT_Y);
    ctx.lineTo(PAD + d*COL_W, CH - PAD);
    ctx.stroke();
  }

  drawNavBar(ctx, W, H, 'weekly', opts.pages);
}


function drawDaily(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.headerA); hg.addColorStop(1, T.headerB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.50, true, true); ctx.fillStyle = C.goldFaint;
  ctx.fillText('일간 계획', 40, BAR_H*0.70);
  ctx.font = F(BAR_H*0.26, false, false); ctx.fillStyle = 'rgba(255,225,235,0.8)';
  ctx.fillText('DAILY PLANNER', W-162, BAR_H*0.68);

  // 날짜 입력 영역
  const PAD    = 14;
  const DATE_Y = BAR_H + PAD;
  const DATE_H = isL ? CH*0.070 : CH*0.050;

  ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
  ctx.fillRect(PAD, DATE_Y, W-PAD*2, DATE_H);
  ctx.strokeRect(PAD, DATE_Y, W-PAD*2, DATE_H);

  ctx.font = F(DATE_H*0.34, true, false); ctx.fillStyle = T.headerA;
  ctx.fillText(`${opts.year}년`, PAD+10, DATE_Y+DATE_H*0.66);

  for (const [label, x] of [['월',W*0.22],['일',W*0.38],['요일',W*0.54]] as [string,number][]) {
    ctx.strokeStyle = T.headerB; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, DATE_Y+DATE_H*0.76); ctx.lineTo(x+50, DATE_Y+DATE_H*0.76); ctx.stroke();
    ctx.font = F(DATE_H*0.28, false, false); ctx.fillStyle = C.textLight;
    ctx.fillText(label, x+56, DATE_Y+DATE_H*0.70);
  }

  // 오늘의 한마디
  const QUOTE_Y = DATE_Y + DATE_H + PAD;
  const QUOTE_H = isL ? CH*0.066 : CH*0.044;
  ctx.fillStyle = T.dayBgSun;
  ctx.fillRect(PAD, QUOTE_Y, W-PAD*2, QUOTE_H);
  ctx.font = F(QUOTE_H*0.38, true, true); ctx.fillStyle = T.headerA;
  ctx.fillText('✦ 오늘의 한마디', PAD+12, QUOTE_Y+QUOTE_H*0.68);

  // 시간대 블록
  const TIME_Y = QUOTE_Y + QUOTE_H + PAD;
  const HOURS  = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const TIME_COLORS: Record<number, string> = {
    6: '#fdf4f7', 7: '#fdf4f7', 8: '#fdf4f7',
    9: '#fefaf2', 10: '#fefaf2', 11: '#fefaf2',
    12: '#f4fdf8', 13: '#f4fdf8',
    14: '#f4f4fd', 15: '#f4f4fd', 16: '#f4f4fd', 17: '#f4f4fd',
    18: '#fdf4f9', 19: '#fdf4f9', 20: '#fdf4f9',
    21: '#f8f4fd', 22: '#f8f4fd',
  };

  const SPLIT   = isL ? Math.ceil(HOURS.length/2) : HOURS.length;
  const COL_CNT = isL ? 2 : 1;
  const COL_W   = (W - PAD*2) / COL_CNT;
  const TIME_H  = (CH - TIME_Y - PAD) / Math.ceil(HOURS.length / COL_CNT);
  const FONT_TM = Math.min(TIME_H*0.36, 17);
  const TLW     = isL ? 56 : 50;

  for (let i = 0; i < HOURS.length; i++) {
    const col = isL && i >= SPLIT ? 1 : 0;
    const row = isL && i >= SPLIT ? i - SPLIT : i;
    const tx  = PAD + col*COL_W;
    const ty  = TIME_Y + row*TIME_H;

    ctx.fillStyle = TIME_COLORS[HOURS[i]] || C.bgCard;
    ctx.fillRect(tx, ty, COL_W-1, TIME_H-1);
    ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
    ctx.strokeRect(tx, ty, COL_W-1, TIME_H-1);

    ctx.font = F(FONT_TM, true, false); ctx.fillStyle = T.headerB;
    ctx.fillText(`${HOURS[i]}:00`, tx+6, ty+TIME_H*0.65);

    ctx.strokeStyle = T.dayBgSat; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(tx+TLW, ty); ctx.lineTo(tx+TLW, ty+TIME_H-1); ctx.stroke();
  }

  // 오른쪽 메모 패널 (세로 전용)
  if (!isL) {
    const NOTE_X = W * 0.72;
    const NOTE_W = W - NOTE_X - PAD;
    const NOTE_H = CH - TIME_Y - PAD;
    ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
    ctx.fillRect(NOTE_X, TIME_Y, NOTE_W, NOTE_H);
    ctx.strokeRect(NOTE_X, TIME_Y, NOTE_W, NOTE_H);
    ctx.font = F(15, true, true); ctx.fillStyle = T.headerA;
    ctx.fillText('메모', NOTE_X+8, TIME_Y+22);
    ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
    for (let r = 1; r <= 10; r++) {
      const ly = TIME_Y + NOTE_H/11*r;
      ctx.beginPath(); ctx.moveTo(NOTE_X+4, ly); ctx.lineTo(NOTE_X+NOTE_W-4, ly); ctx.stroke();
    }
  }

  drawNavBar(ctx, W, H, 'daily', opts.pages);
}


// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

/**
 * 단일 페이지를 캔버스에 렌더링 (미리보기용)
 * canvas.width / height를 직접 설정하면 원하는 해상도로 렌더링
 */
export function renderPreviewPage(
  canvas: HTMLCanvasElement,
  pageType: PageType,
  pageIdx: number,     // month 0-11 | week 1-52
  opts: PlannerOptions,
): void {
  T = getTheme(opts.theme);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;

  if (pageType === 'cover')      drawCover(ctx, W, H, opts);
  else if (pageType === 'year-index') drawYearIndex(ctx, W, H, opts);
  else if (pageType === 'monthly')    drawMonthly(ctx, W, H, opts, pageIdx);
  else if (pageType === 'weekly')     drawWeekly(ctx, W, H, opts, pageIdx || 1);
  else if (pageType === 'daily')      drawDaily(ctx, W, H, opts);
}

export async function generatePlannerPDF(opts: PlannerOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');

  // 테마 설정
  T = getTheme(opts.theme);

  const isL = opts.orientation === 'landscape';
  const CW  = isL ? PORTRAIT_H : PORTRAIT_W;
  const CH  = isL ? PORTRAIT_W : PORTRAIT_H;
  const PW  = isL ? 842 : 595;    // jsPDF A4 pt
  const PH  = isL ? 595 : 842;
  const scalX = PW / CW;
  const scalY = PH / CH;

  try { await document.fonts.ready; } catch { /* ignore */ }

  const doc = new jsPDF({ orientation: opts.orientation, unit: 'pt', format: 'a4' });

  const canvas    = document.createElement('canvas');
  canvas.width    = CW;
  canvas.height   = CH;
  const ctx       = canvas.getContext('2d')!;

  // 확장 페이지 목록
  const expandedPages: { type: PageType; label: string; idx?: number }[] = [];
  for (const p of opts.pages) {
    if (p === 'monthly') {
      for (let m = 0; m < 12; m++)
        expandedPages.push({ type: 'monthly', label: MONTHS_KO[m]+'간 플래너', idx: m });
    } else if (p === 'weekly') {
      for (let w = 1; w <= 52; w++)
        expandedPages.push({ type: 'weekly', label: `${w}주차`, idx: w });
    } else if (p === 'daily') {
      expandedPages.push({ type: 'daily', label: '일간 플래너 샘플' });
    } else if (p === 'cover') {
      expandedPages.push({ type: 'cover', label: '커버 페이지' });
    } else if (p === 'year-index') {
      expandedPages.push({ type: 'year-index', label: '연간 인덱스' });
    }
  }

  // 섹션별 첫 페이지 번호 (jsPDF는 1-based)
  const sectionStart = new Map<PageType, number>();
  expandedPages.forEach((p, i) => {
    if (!sectionStart.has(p.type)) sectionStart.set(p.type, i+1);
  });

  const total = expandedPages.length;

  for (let i = 0; i < expandedPages.length; i++) {
    const page = expandedPages[i];
    opts.onProgress?.(i+1, total, page.label);
    ctx.clearRect(0, 0, CW, CH);

    let pageNavLinks: NavLink[] = [];

    if (page.type === 'cover') {
      drawCover(ctx, CW, CH, opts);
    } else if (page.type === 'year-index') {
      pageNavLinks = drawYearIndex(ctx, CW, CH, opts);
    } else if (page.type === 'monthly') {
      pageNavLinks = drawMonthly(ctx, CW, CH, opts, page.idx!);
    } else if (page.type === 'weekly') {
      drawWeekly(ctx, CW, CH, opts, page.idx!);
    } else if (page.type === 'daily') {
      drawDaily(ctx, CW, CH, opts);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.90);
    if (i > 0) doc.addPage([PW, PH], opts.orientation);
    doc.addImage(imgData, 'JPEG', 0, 0, PW, PH);

    // ── 하단 네비게이션 탭 하이퍼링크 ──────────────────────────────────────
    const navH_pt = PH * NAV_H_RATIO;
    const tabW_pt = PW / NAV_SECTIONS.length;
    for (let t = 0; t < NAV_SECTIONS.length; t++) {
      const targetPage = sectionStart.get(NAV_SECTIONS[t].type);
      if (targetPage !== undefined) {
        try {
          doc.link(t * tabW_pt, PH - navH_pt, tabW_pt, navH_pt, { pageNumber: targetPage });
        } catch { /* jsPDF 버전에 따라 무시 */ }
      }
    }

    // ── 내부 콘텐츠 NavLink 처리 (연간→월간, 월간→주간) ──────────────────
    for (const link of pageNavLinks) {
      let targetPageNum = -1;

      if (link.targetType === 'monthly') {
        const idx = expandedPages.findIndex(
          (p) => p.type === 'monthly' && p.idx === link.targetIdx,
        );
        if (idx >= 0) targetPageNum = idx + 1;
      } else if (link.targetType === 'weekly') {
        const idx = expandedPages.findIndex(
          (p) => p.type === 'weekly' && p.idx === link.targetIdx,
        );
        if (idx >= 0) targetPageNum = idx + 1;
      }

      if (targetPageNum > 0) {
        try {
          doc.link(
            link.x * scalX, link.y * scalY,
            link.w * scalX, link.h * scalY,
            { pageNumber: targetPageNum },
          );
        } catch { /* ignore */ }
      }
    }
  }

  doc.save(`fortunetab_${opts.year}_planner_${opts.orientation}.pdf`);
}
