/**
 * FortuneTab Client-side PDF Generator v3
 * Canvas 2D API → jsPDF · 브라우저 전용
 *
 * 디자인: 소프트 로즈/라벤더 팔레트 (20대 여성 감성)
 * 폰트: Noto Serif KR (제목) + Noto Sans KR (본문)
 * 네비게이션: 하단 탭 바 + jsPDF 내부 하이퍼링크
 */

export type Orientation = 'portrait' | 'landscape';
export type PageType = 'cover' | 'year-index' | 'monthly' | 'weekly' | 'daily';

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
  saju?: SajuData;
  onProgress?: (current: number, total: number, label: string) => void;
}

// Canvas 해상도 (150dpi A4)
const PORTRAIT_W = 1240;
const PORTRAIT_H = 1754;

// ── 소프트 로즈/라벤더 팔레트 ────────────────────────────────────────────────
const C = {
  // 표지 다크 배경 (따뜻한 와인)
  coverDeep:  '#180d13',
  coverMid:   '#2a1520',
  coverLight: '#3d2030',

  // 인테리어 배경
  bgPage:     '#faf5f0',
  bgCard:     '#fffbf8',
  bgCardRose: '#fff5f8',

  // 로즈 헤더
  roseDeep:   '#8b3f5c',
  roseMid:    '#a85e78',
  roseLight:  '#cc9aaa',
  rose200:    '#f0d0da',
  rose100:    '#fce8f0',

  // 라벤더 (주간 전용)
  lavDeep:    '#6a5a90',
  lavMid:     '#8878b0',
  lavLight:   '#b4a8d4',
  lav100:     '#ece8f8',

  // 텍스트
  textDark:   '#2a1a22',
  textMid:    '#7a5560',
  textLight:  '#b898a4',

  // 구분선
  ruleColor:  '#eedde4',
  ruleFaint:  '#f6eef1',

  // 날짜 색상
  sunday:     '#b84060',
  saturday:   '#6060b4',
  holiday:    '#b84060',
  holidayBg:  '#fce8f0',
  today:      '#fce0ea',

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
  // 로즈 글로우
  const glow = ctx.createRadialGradient(cx, cy, r*0.8, cx, cy, r*1.6);
  glow.addColorStop(0, 'rgba(200,100,140,0.22)');
  glow.addColorStop(1, 'rgba(200,100,140,0)');
  ctx.beginPath(); ctx.arc(cx, cy, r*1.6, 0, Math.PI*2);
  ctx.fillStyle = glow; ctx.fill();

  // 황금 원
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  ctx.fillStyle = C.goldPale; ctx.fill();

  // 초승달 그림자
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
  grad.addColorStop(0, C.roseDeep);
  grad.addColorStop(1, C.coverLight);
  ctx.fillStyle = grad;
  ctx.fillRect(0, barY, W, NAV_H);

  // 상단 경계
  ctx.strokeStyle = 'rgba(200,120,150,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, barY); ctx.lineTo(W, barY); ctx.stroke();

  const tabW     = W / NAV_SECTIONS.length;
  const fontSize = NAV_H * 0.42;

  for (let i = 0; i < NAV_SECTIONS.length; i++) {
    const { type, label } = NAV_SECTIONS[i];
    const cx       = i * tabW + tabW / 2;
    const isActive = type === currentType;
    const isAvail  = availablePages.includes(type);

    if (isActive) {
      ctx.fillStyle = 'rgba(255,245,248,0.2)';
      roundRect(ctx, i*tabW+3, barY+3, tabW-6, NAV_H-6, 4);
      ctx.fill();
    }

    ctx.font = F(fontSize, isActive);
    ctx.fillStyle = isActive
      ? '#fff5f8'
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

  // 배경 그라디언트 (와인/베리)
  const grad = ctx.createLinearGradient(0, 0, isL ? W : 0, isL ? 0 : CH);
  grad.addColorStop(0, C.coverDeep);
  grad.addColorStop(0.55, C.coverMid);
  grad.addColorStop(1, C.coverLight);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, CH);
  drawStars(ctx, W, CH);

  if (!isL) {
    // ── 세로 레이아웃 ─────────────────────────────────────────────────────
    const MX = W / 2;
    const MY = CH * 0.19;
    const bgMid = lerpColor(hexToRgb(C.coverDeep), hexToRgb(C.coverMid), MY / CH);
    drawMoon(ctx, MX, MY, W * 0.085, bgMid);

    // 브랜드명
    ctx.font = F(26, false, false); ctx.fillStyle = C.goldFaint;
    centeredText(ctx, 'fortunetab', CH * 0.33, W);

    drawRule(ctx, CH * 0.355, W, 150, C.goldDim, false);

    // 연도 (대형 세리프)
    ctx.font = F(W * 0.155, true, true); ctx.fillStyle = C.gold;
    centeredText(ctx, String(opts.year), CH * 0.535, W);

    drawRule(ctx, CH * 0.563, W, 150, C.goldDim, true);

    // 제목 (간격 충분히 확보)
    ctx.font = F(44, true, true); ctx.fillStyle = C.white;
    centeredText(ctx, '나만의 365일 플래너', CH * 0.625, W);

    ctx.font = F(23, false, false); ctx.fillStyle = 'rgba(230,200,215,0.85)';
    centeredText(ctx, `사주로 읽는 ${opts.year}년 운세 일력`, CH * 0.675, W);

    // 이름 필드
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

    // 사주 정보
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

    // 하단 태그라인
    const tagY = opts.saju ? CH * 0.955 : CH * 0.930;
    drawRule(ctx, tagY - CH*0.016, W, 200, C.goldDim, false);
    ctx.font = F(15, false, false); ctx.fillStyle = C.goldDim;
    centeredText(ctx, `FORTUNE  ·  TAB  ·  ${opts.year}`, tagY, W);

  } else {
    // ── 가로 레이아웃 ─────────────────────────────────────────────────────
    const MX = W * 0.26, MY = CH * 0.5;
    const bgMid = lerpColor(hexToRgb(C.coverDeep), hexToRgb(C.coverMid), 0.5);
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
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.060);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, C.roseDeep); hg.addColorStop(1, C.roseMid);
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

    // 카드 배경
    ctx.fillStyle = C.bgCard;
    roundRect(ctx, cx2, cy2, CW_, CELL_H, 8); ctx.fill();
    ctx.strokeStyle = C.rose200; ctx.lineWidth = 1;
    roundRect(ctx, cx2, cy2, CW_, CELL_H, 8); ctx.stroke();

    // 월 헤더 (로즈)
    const MH = FM * 1.7;
    const mg = ctx.createLinearGradient(cx2, cy2, cx2+CW_, cy2);
    mg.addColorStop(0, C.roseDeep); mg.addColorStop(1, C.roseMid);
    ctx.fillStyle = mg;
    roundRect(ctx, cx2, cy2, CW_, MH, 8); ctx.fill();
    ctx.fillRect(cx2, cy2+MH/2, CW_, MH/2);

    ctx.font = F(FM, true, true); ctx.fillStyle = C.goldFaint;
    const mw = ctx.measureText(MONTHS_KO[m]).width;
    ctx.fillText(MONTHS_KO[m], cx2+(CW_-mw)/2, cy2+FM*1.25);

    // 요일 헤더
    const HDRY  = cy2 + MH + 5;
    const CELLW = (CW_-8) / 7;
    const DAY_CLR = [C.sunday,C.textDark,C.textDark,C.textDark,C.textDark,C.textDark,C.saturday];

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
      ctx.font = F(FDN, false, false);
      ctx.fillStyle = dow===0 ? C.sunday : dow===6 ? C.saturday : C.textDark;
      ctx.fillText(String(d), nx - ctx.measureText(String(d)).width/2, ny);
    }
  }

  drawNavBar(ctx, W, H, 'year-index', opts.pages);
}


function drawMonthly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  monthIdx: number,
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (로즈)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.058);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, C.roseDeep); hg.addColorStop(1, C.roseMid);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  // 월 이름 (세리프)
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

  const DAY_BG  = [C.rose100, '#f8f4ff', '#f4f6ff', '#f4f6ff', '#f4f6ff', '#f4f6ff', C.lav100];
  const DAY_COL = [C.sunday, C.textDark, C.textDark, C.textDark, C.textDark, C.textDark, C.saturday];

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
  const today  = new Date();

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {
      const dayNum = row*7 + col - first + 1;
      const cx2    = GX + col*CELL_W;
      const cy2    = CELL_Y + row*CELL_H;

      ctx.fillStyle = (col===0||col===6) ? C.bgCardRose : C.bgCard;
      ctx.fillRect(cx2, cy2, CELL_W-1, CELL_H-1);
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
      ctx.strokeRect(cx2, cy2, CELL_W-1, CELL_H-1);

      if (dayNum >= 1 && dayNum <= days) {
        const isToday = (
          today.getFullYear() === opts.year &&
          today.getMonth() === monthIdx &&
          today.getDate() === dayNum
        );
        if (isToday) {
          ctx.beginPath(); ctx.arc(cx2+NF, cy2+NF*1.1, NF*0.88, 0, Math.PI*2);
          ctx.fillStyle = C.roseDeep; ctx.fill();
          ctx.font = F(NF, true, false); ctx.fillStyle = C.goldFaint;
        } else {
          ctx.font = F(NF, true, false);
          ctx.fillStyle = col===0 ? C.sunday : col===6 ? C.saturday : C.textDark;
        }
        ctx.fillText(String(dayNum), cx2 + NF*0.30, cy2 + NF*1.35);
      }
    }
  }

  drawNavBar(ctx, W, H, 'monthly', opts.pages);
}


function drawWeekly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  weekLabel: string,
) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (라벤더 - 주간 전용)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, C.lavDeep); hg.addColorStop(1, C.lavMid);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.52, true, true); ctx.fillStyle = C.goldFaint;
  ctx.fillText(weekLabel, 40, BAR_H*0.70);
  ctx.font = F(BAR_H*0.27, false, false); ctx.fillStyle = 'rgba(220,210,248,0.8)';
  ctx.fillText('주간 계획', W-120, BAR_H*0.68);

  // 이번 주 목표 (세로 전용)
  const PAD = 14;
  let CONTENT_Y = BAR_H + PAD;

  if (!isL) {
    const GOAL_H = CH * 0.058;
    ctx.fillStyle = C.lav100; ctx.strokeStyle = C.lavLight; ctx.lineWidth = 1;
    ctx.fillRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.strokeRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.font = F(GOAL_H*0.34, true, false); ctx.fillStyle = C.lavDeep;
    ctx.fillText('이번 주 목표', PAD+10, CONTENT_Y+GOAL_H*0.66);
    ctx.strokeStyle = C.lavLight; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD+96, CONTENT_Y); ctx.lineTo(PAD+96, CONTENT_Y+GOAL_H);
    ctx.stroke();
    CONTENT_Y += GOAL_H + PAD;
  }

  // 요일 헤더
  const DAYS_FULL = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const COLS      = 7;
  const COL_W     = (W - PAD*2) / COLS;
  const CONTENT_H = CH - CONTENT_Y - PAD;
  const DAY_H     = isL ? CONTENT_H*0.11 : CONTENT_H*0.08;

  const DAY_BG2  = [C.rose100, C.lav100, C.lav100, C.lav100, C.lav100, C.lav100, '#e8e4f8'];
  const DAY_FG2  = [C.sunday, C.lavDeep, C.lavDeep, C.lavDeep, C.lavDeep, C.lavDeep, C.saturday];
  const FONT_D2  = DAY_H * 0.34;

  for (let d = 0; d < 7; d++) {
    ctx.fillStyle = DAY_BG2[d];
    ctx.fillRect(PAD + d*COL_W, CONTENT_Y, COL_W-1, DAY_H);
    ctx.font = F(FONT_D2, true, false); ctx.fillStyle = DAY_FG2[d];
    const dw = ctx.measureText(isL ? DAYS_FULL[d] : DAYS_KO[d]).width;
    ctx.fillText(
      isL ? DAYS_FULL[d] : DAYS_KO[d],
      PAD + d*COL_W + (COL_W-dw)/2,
      CONTENT_Y + DAY_H*0.68,
    );
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
    ctx.strokeStyle = C.lavLight; ctx.lineWidth = 0.7;
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

  // 헤더 (로즈)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, C.roseDeep); hg.addColorStop(1, C.roseMid);
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

  ctx.font = F(DATE_H*0.34, true, false); ctx.fillStyle = C.roseDeep;
  ctx.fillText(`${opts.year}년`, PAD+10, DATE_Y+DATE_H*0.66);

  for (const [label, x] of [['월',W*0.22],['일',W*0.38],['요일',W*0.54]] as [string,number][]) {
    ctx.strokeStyle = C.roseMid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, DATE_Y+DATE_H*0.76); ctx.lineTo(x+50, DATE_Y+DATE_H*0.76); ctx.stroke();
    ctx.font = F(DATE_H*0.28, false, false); ctx.fillStyle = C.textLight;
    ctx.fillText(label, x+56, DATE_Y+DATE_H*0.70);
  }

  // 오늘의 한마디
  const QUOTE_Y = DATE_Y + DATE_H + PAD;
  const QUOTE_H = isL ? CH*0.066 : CH*0.044;
  ctx.fillStyle = C.rose100; ctx.fillRect(PAD, QUOTE_Y, W-PAD*2, QUOTE_H);
  ctx.font = F(QUOTE_H*0.38, true, true); ctx.fillStyle = C.roseDeep;
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

    ctx.font = F(FONT_TM, true, false); ctx.fillStyle = C.roseMid;
    ctx.fillText(`${HOURS[i]}:00`, tx+6, ty+TIME_H*0.65);

    ctx.strokeStyle = C.roseLight; ctx.lineWidth = 0.7;
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
    ctx.font = F(15, true, true); ctx.fillStyle = C.roseDeep;
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

export async function generatePlannerPDF(opts: PlannerOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const isL = opts.orientation === 'landscape';
  const CW  = isL ? PORTRAIT_H : PORTRAIT_W;
  const CH  = isL ? PORTRAIT_W : PORTRAIT_H;
  const PW  = isL ? 842 : 595;    // jsPDF A4 pt
  const PH  = isL ? 595 : 842;

  // Google 폰트 로드 대기
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

    if (page.type === 'cover') {
      drawCover(ctx, CW, CH, opts);
    } else if (page.type === 'year-index') {
      drawYearIndex(ctx, CW, CH, opts);
    } else if (page.type === 'monthly') {
      drawMonthly(ctx, CW, CH, opts, page.idx!);
    } else if (page.type === 'weekly') {
      drawWeekly(ctx, CW, CH, opts, `${opts.year}년 ${page.idx!}주차`);
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
  }

  doc.save(`fortunetab_${opts.year}_planner_${opts.orientation}.pdf`);
}
