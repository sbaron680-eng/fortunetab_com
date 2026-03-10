/**
 * FortuneTab Client-side PDF Generator
 * Canvas 2D API → jsPDF (브라우저 전용, 서버 불필요)
 *
 * 한글 지원: Canvas 2D는 시스템 폰트를 직접 사용하므로
 *            Malgun Gothic / Noto Sans CJK 등 OS 폰트 그대로 렌더링
 */

export type Orientation = 'portrait' | 'landscape';
export type PageType = 'cover' | 'year-index' | 'monthly' | 'weekly' | 'daily';

export interface PlannerOptions {
  orientation: Orientation;
  year: number;
  name: string;
  pages: PageType[];
  onProgress?: (current: number, total: number, label: string) => void;
}

// ── Canvas 해상도 (150dpi A4) ───────────────────────────────────────────────
// Portrait:  1240 × 1754 px
// Landscape: 1754 × 1240 px
const PORTRAIT_W  = 1240;
const PORTRAIT_H  = 1754;

// ── 팔레트 ─────────────────────────────────────────────────────────────────
const C = {
  indigoDeep:  '#1e1b4b',
  indigoMid:   '#312e81',
  indigoLight: '#4338ca',
  indigo100:   '#e0e7ff',
  indigo200:   '#c7d2fe',
  gold:        '#f59e0b',
  goldPale:    '#fbbf24',
  goldFaint:   '#fde68a',
  goldDim:     '#b4822a',
  white:       '#ffffff',
  whiteSoft:   '#dcdaf0',
  textDark:    '#1e1b4b',
  textLight:   '#94a3b8',
  ruleLight:   '#c7d2fe',
  bgPage:      '#faf9fc',
  bgCell:      '#f8f9ff',
};

// ── 폰트 스택 ──────────────────────────────────────────────────────────────
const KO_FONT   = '"Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif';
const KO_BOLD   = `bold ${KO_FONT}`;

// ── 유틸 ───────────────────────────────────────────────────────────────────
function lerpColor(c1: [number,number,number], c2: [number,number,number], t: number): string {
  const r = Math.round(c1[0] + (c2[0]-c1[0])*t);
  const g = Math.round(c1[1] + (c2[1]-c1[1])*t);
  const b = Math.round(c1[2] + (c2[2]-c1[2])*t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): [number,number,number] {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function centeredText(ctx: CanvasRenderingContext2D, text: string, y: number, W: number) {
  const m = ctx.measureText(text);
  ctx.fillText(text, (W - m.width) / 2, y);
}

// ── 배경 그라디언트 (인디고) ───────────────────────────────────────────────
function drawIndigoGradient(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const grad = ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0, C.indigoDeep);
  grad.addColorStop(1, C.indigoMid);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,H);
}

// ── 별 필드 ─────────────────────────────────────────────────────────────────
function drawStars(ctx: CanvasRenderingContext2D, W: number, H: number, seed=2026) {
  let s = seed;
  const rng = () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };

  for (let i=0; i<200; i++) {
    const x = rng() * W;
    const y = rng() * (H * 0.85);
    const r = rng() > 0.85 ? 2 : rng() > 0.7 ? 1 : 0.5;
    const br = 55 + rng() * 130;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${Math.round(br)},${Math.round(br)},${Math.min(255,Math.round(br+35))},0.9)`;
    ctx.fill();
  }

  // 밝은 십자 별
  const bright = [[W*0.13,H*0.12],[W*0.87,H*0.10],[W*0.18,H*0.33],
                  [W*0.82,H*0.28],[W*0.06,H*0.51],[W*0.92,H*0.49]];
  for (const [bx,by] of bright) {
    ctx.beginPath(); ctx.arc(bx,by,3,0,Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,220,0.95)'; ctx.fill();
    for (const [dx,dy] of [[0,-10],[0,10],[-10,0],[10,0]]) {
      ctx.beginPath(); ctx.arc(bx+dx,by+dy,1,0,Math.PI*2);
      ctx.fillStyle = 'rgba(180,180,220,0.6)'; ctx.fill();
    }
  }
}

// ── 초승달 ─────────────────────────────────────────────────────────────────
function drawMoon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, bgColor: string) {
  // 황금 원
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle = C.goldPale; ctx.fill();
  // 그림자 원 (배경색으로 초승달 모양 만들기)
  ctx.beginPath(); ctx.arc(cx + r*0.47, cy - r*0.06, r*0.83, 0, Math.PI*2);
  ctx.fillStyle = bgColor; ctx.fill();
  // 달무리
  ctx.beginPath(); ctx.arc(cx,cy,r+12,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(245,158,11,0.12)'; ctx.lineWidth=8; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r+6,0,Math.PI*2);
  ctx.strokeStyle = 'rgba(245,158,11,0.08)'; ctx.lineWidth=4; ctx.stroke();
}

// ── 가로선 구분자 ───────────────────────────────────────────────────────────
function drawRule(ctx: CanvasRenderingContext2D, y: number, W: number,
                  margin=130, color=C.goldDim, diamond=true) {
  ctx.beginPath();
  ctx.moveTo(margin,y); ctx.lineTo(W-margin,y);
  ctx.strokeStyle=color; ctx.lineWidth=1; ctx.stroke();
  if (diamond) {
    const d=7;
    ctx.beginPath();
    ctx.moveTo(W/2, y-d); ctx.lineTo(W/2+d, y);
    ctx.lineTo(W/2, y+d); ctx.lineTo(W/2-d, y);
    ctx.closePath(); ctx.fillStyle=color; ctx.fill();
  }
}

// ── 월 이름 ────────────────────────────────────────────────────────────────
const MONTHS_KO = ['1월','2월','3월','4월','5월','6월',
                   '7월','8월','9월','10월','11월','12월'];
const DAYS_KO   = ['일','월','화','수','목','금','토'];

// 해당 월의 1일 요일(0=일) 반환
function firstDayOf(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month+1, 0).getDate();
}

// ════════════════════════════════════════════════════════════════════════════
//  PAGE DRAWERS
// ════════════════════════════════════════════════════════════════════════════

// ── 커버 페이지 ─────────────────────────────────────────────────────────────
function drawCover(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions) {
  const isL = opts.orientation === 'landscape';

  drawIndigoGradient(ctx, W, H);
  drawStars(ctx, W, H);

  if (isL) {
    // 가로: 왼쪽 절반에 달, 오른쪽에 텍스트
    const MX = W*0.27, MY = H*0.5;
    const bgMid = lerpColor(hexToRgb(C.indigoDeep), hexToRgb(C.indigoMid), MY/H);
    drawMoon(ctx, MX, MY, H*0.22, bgMid);

    // 세로 구분선
    ctx.beginPath(); ctx.moveTo(W*0.5, H*0.1); ctx.lineTo(W*0.5, H*0.9);
    ctx.strokeStyle='rgba(245,158,11,0.25)'; ctx.lineWidth=1; ctx.stroke();

    // 오른쪽 텍스트 영역
    const RX = W*0.5;
    const RW = W*0.5;

    ctx.fillStyle = C.gold;
    ctx.font = `bold 38px ${KO_FONT}`;
    const bw = ctx.measureText('fortunetab').width;
    ctx.fillText('fortunetab', RX + (RW-bw)/2, H*0.32);

    drawRule(ctx, H*0.38, W, W*0.52, C.goldDim, false);

    ctx.fillStyle = C.gold;
    ctx.font = `bold ${H*0.28}px ${KO_FONT}`;
    const yw = ctx.measureText(String(opts.year)).width;
    ctx.fillText(String(opts.year), RX + (RW-yw)/2, H*0.67);

    drawRule(ctx, H*0.72, W, W*0.52, C.goldDim, true);

    ctx.fillStyle = C.white;
    ctx.font = `bold 30px ${KO_FONT}`;
    const t1 = '사주·운세로 설계한 나만의 플래너';
    const tw = ctx.measureText(t1).width;
    ctx.fillText(t1, RX + (RW-tw)/2, H*0.80);

    // 이름 필드
    const FX = RX + RW*0.15;
    const FW = RW*0.7;
    ctx.fillStyle = C.goldFaint;
    ctx.font = `22px ${KO_FONT}`;
    ctx.fillText('이름', FX, H*0.89);
    ctx.beginPath(); ctx.moveTo(FX, H*0.93); ctx.lineTo(FX+FW, H*0.93);
    ctx.strokeStyle=C.gold; ctx.lineWidth=2; ctx.stroke();

    if (opts.name) {
      ctx.fillStyle = C.white;
      ctx.font = `bold 26px ${KO_FONT}`;
      ctx.fillText(opts.name, FX+8, H*0.915);
    }

  } else {
    // 세로: 원본 디자인 충실히 재현
    const MX = W/2, MY = H*0.17;
    const bgMid = lerpColor(hexToRgb(C.indigoDeep), hexToRgb(C.indigoMid), MY/H);
    drawMoon(ctx, MX, MY, W*0.095, bgMid);

    // 브랜드명
    ctx.fillStyle = C.gold;
    ctx.font = `bold 36px ${KO_FONT}`;
    centeredText(ctx, 'fortunetab', H*0.32, W);

    drawRule(ctx, H*0.345, W, 140, C.goldDim, false);

    // 연도
    ctx.fillStyle = C.gold;
    ctx.font = `bold ${W*0.17}px ${KO_FONT}`;
    centeredText(ctx, String(opts.year), H*0.57, W);

    drawRule(ctx, H*0.605, W, 140, C.goldDim, true);

    // 한글 제목
    ctx.fillStyle = C.white;
    ctx.font = `bold 52px ${KO_FONT}`;
    centeredText(ctx, '사주·운세로 설계한', H*0.66, W);
    ctx.fillStyle = C.whiteSoft;
    ctx.font = `bold 52px ${KO_FONT}`;
    centeredText(ctx, '나만의 365일 플래너', H*0.72, W);

    // 소제목
    ctx.fillStyle = C.goldDim;
    ctx.font = `20px ${KO_FONT}`;
    centeredText(ctx, '사주로 읽는 당신의 '+opts.year+'년 운세 플래너', H*0.775, W);

    // 이름 필드
    const FX = (W-520)/2;
    ctx.fillStyle = C.goldFaint;
    ctx.font = `24px ${KO_FONT}`;
    ctx.fillText('이름', FX, H*0.866);
    ctx.beginPath(); ctx.moveTo(FX, H*0.895); ctx.lineTo(FX+520, H*0.895);
    ctx.strokeStyle=C.gold; ctx.lineWidth=2; ctx.stroke();
    // 세로선 장식
    ctx.beginPath(); ctx.moveTo(FX, H*0.895); ctx.lineTo(FX, H*0.888);
    ctx.strokeStyle=C.gold; ctx.lineWidth=1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FX+520, H*0.895); ctx.lineTo(FX+520, H*0.888);
    ctx.strokeStyle=C.gold; ctx.lineWidth=1; ctx.stroke();

    if (opts.name) {
      ctx.fillStyle = C.white;
      ctx.font = `bold 30px ${KO_FONT}`;
      ctx.fillText(opts.name, FX+8, H*0.888);
    }

    // 하단 태그라인
    drawRule(ctx, H*0.948, W, 200, C.goldDim, false);
    ctx.fillStyle = C.goldDim;
    ctx.font = `18px ${KO_FONT}`;
    centeredText(ctx, 'FORTUNE · TAB · '+opts.year, H*0.966, W);
  }
}

// ── 연간 인덱스 ─────────────────────────────────────────────────────────────
function drawYearIndex(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions) {
  const isL = opts.orientation === 'landscape';

  // 밝은 배경
  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0,0,W,H);

  // 상단 헤더바
  const BAR_H = isL ? H*0.11 : H*0.07;
  ctx.fillStyle = C.indigoDeep;
  ctx.fillRect(0,0,W,BAR_H);

  ctx.fillStyle = C.gold;
  ctx.font = `bold ${isL ? H*0.058 : H*0.035}px ${KO_FONT}`;
  ctx.fillText(String(opts.year), isL ? 50 : 50, BAR_H*0.72);

  ctx.fillStyle = C.whiteSoft;
  ctx.font = `${isL ? H*0.028 : H*0.018}px ${KO_FONT}`;
  ctx.fillText('연간 인덱스', isL ? 50 : W-160, BAR_H * (isL ? 0.88 : 0.72));

  // 12달 그리드
  const COLS = isL ? 4 : 3;
  const ROWS = isL ? 3 : 4;
  const PAD = isL ? 20 : 16;
  const GRID_X = PAD;
  const GRID_Y = BAR_H + (isL ? 20 : 15);
  const CW = (W - PAD * (COLS+1)) / COLS;
  const CH = (H - GRID_Y - (isL ? 15 : 12)) / ROWS;
  const FONT_MONTH = isL ? Math.min(CW*0.22, H*0.055) : Math.min(CW*0.22, H*0.032);
  const FONT_DAY   = isL ? Math.min(CW*0.11, H*0.025) : Math.min(CW*0.11, H*0.018);
  const FONT_NUM   = isL ? Math.min(CW*0.095, H*0.022) : Math.min(CW*0.095, H*0.016);

  for (let m=0; m<12; m++) {
    const col = m % COLS;
    const row = Math.floor(m / COLS);
    const x = GRID_X + col * (CW + PAD);
    const y = GRID_Y + row * (CH + (isL ? 10 : 8));

    // 카드 배경
    ctx.fillStyle = C.white;
    roundRect(ctx, x, y, CW, CH, 6);
    ctx.fill();
    ctx.strokeStyle = C.indigo200;
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, CW, CH, 6);
    ctx.stroke();

    // 월 헤더
    ctx.fillStyle = C.indigoDeep;
    roundRect(ctx, x, y, CW, FONT_MONTH*1.6, 6);
    ctx.fill();

    ctx.fillStyle = C.gold;
    ctx.font = `bold ${FONT_MONTH}px ${KO_FONT}`;
    const mw = ctx.measureText(MONTHS_KO[m]).width;
    ctx.fillText(MONTHS_KO[m], x + (CW-mw)/2, y + FONT_MONTH*1.2);

    // 요일 헤더
    const HEADER_Y = y + FONT_MONTH*1.6 + 4;
    const CELL_W = (CW-8) / 7;
    const DAY_COLORS = ['#ef4444','#1e1b4b','#1e1b4b','#1e1b4b','#1e1b4b','#1e1b4b','#3b82f6'];
    for (let d=0; d<7; d++) {
      ctx.fillStyle = DAY_COLORS[d];
      ctx.font = `bold ${FONT_DAY}px ${KO_FONT}`;
      const dw = ctx.measureText(DAYS_KO[d]).width;
      ctx.fillText(DAYS_KO[d], x+4 + d*CELL_W + (CELL_W-dw)/2, HEADER_Y + FONT_DAY);
    }

    // 날짜 그리드
    const first = firstDayOf(opts.year, m);
    const days  = daysInMonth(opts.year, m);
    const NUM_START_Y = HEADER_Y + FONT_DAY*1.8;
    const ROW_H = (CH - (NUM_START_Y-y) - 4) / 6;

    for (let d=1; d<=days; d++) {
      const dayOfWeek = (first + d-1) % 7;
      const weekRow   = Math.floor((first + d-1) / 7);
      const cx = x+4 + dayOfWeek * CELL_W + CELL_W/2;
      const cy = NUM_START_Y + weekRow * ROW_H + ROW_H*0.65;

      const numColor = dayOfWeek===0 ? '#ef4444' : dayOfWeek===6 ? '#3b82f6' : C.textDark;
      ctx.fillStyle = numColor;
      ctx.font = `${FONT_NUM}px ${KO_FONT}`;
      const nw = ctx.measureText(String(d)).width;
      ctx.fillText(String(d), cx - nw/2, cy);
    }
  }
}

// ── 월간 플래너 ─────────────────────────────────────────────────────────────
function drawMonthly(ctx: CanvasRenderingContext2D, W: number, H: number,
                     opts: PlannerOptions, monthIdx: number) {
  const isL = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0,0,W,H);

  // 헤더
  const BAR_H = isL ? H*0.10 : H*0.06;
  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0, C.indigoDeep);
  grad.addColorStop(1, C.indigoMid);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,BAR_H);

  // 월 이름 + 연도
  ctx.fillStyle = C.gold;
  ctx.font = `bold ${BAR_H*0.55}px ${KO_FONT}`;
  ctx.fillText(MONTHS_KO[monthIdx], 50, BAR_H*0.70);
  ctx.fillStyle = C.indigo200;
  ctx.font = `${BAR_H*0.28}px ${KO_FONT}`;
  ctx.fillText(String(opts.year), 50 + ctx.measureText(MONTHS_KO[monthIdx]).width + 16, BAR_H*0.68);

  // 요일 헤더
  const PAD = 12;
  const GRID_X = PAD;
  const GRID_Y = BAR_H + (isL ? 12 : 10);
  const CELL_W = (W-PAD*2) / 7;
  const DAY_H = isL ? H*0.055 : H*0.036;

  const DAY_BG = ['#fef2f2','#eef2ff','#eef2ff','#eef2ff','#eef2ff','#eef2ff','#eff6ff'];
  const DAY_COL = ['#ef4444','#312e81','#312e81','#312e81','#312e81','#312e81','#1d4ed8'];
  for (let d=0; d<7; d++) {
    ctx.fillStyle = DAY_BG[d];
    ctx.fillRect(GRID_X + d*CELL_W, GRID_Y, CELL_W-1, DAY_H);
    ctx.fillStyle = DAY_COL[d];
    ctx.font = `bold ${DAY_H*0.52}px ${KO_FONT}`;
    const dw = ctx.measureText(DAYS_KO[d]).width;
    ctx.fillText(DAYS_KO[d], GRID_X + d*CELL_W + (CELL_W-dw)/2, GRID_Y + DAY_H*0.72);
  }

  // 날짜 셀
  const CELL_AREA_Y = GRID_Y + DAY_H + 2;
  const REMAINING_H = H - CELL_AREA_Y - PAD;
  const NUM_ROWS = 6;
  const CELL_H = REMAINING_H / NUM_ROWS;

  const first = firstDayOf(opts.year, monthIdx);
  const days  = daysInMonth(opts.year, monthIdx);
  const NUM_FONT = Math.min(CELL_H*0.25, CELL_W*0.22, 22);

  for (let row=0; row<NUM_ROWS; row++) {
    for (let col=0; col<7; col++) {
      const dayNum = row*7 + col - first + 1;
      const cx = GRID_X + col * CELL_W;
      const cy = CELL_AREA_Y + row * CELL_H;
      const cw = CELL_W - 1;
      const ch = CELL_H - 1;

      // 셀 배경
      ctx.fillStyle = (col===0||col===6) ? '#f9f9ff' : C.white;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeStyle = C.ruleLight;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, cy, cw, ch);

      if (dayNum >= 1 && dayNum <= days) {
        const isWeekend = col===0 || col===6;
        const numColor = col===0 ? '#ef4444' : col===6 ? '#1d4ed8' : C.textDark;

        // 날짜 원 (오늘이면 인디고 배경)
        const isToday = (new Date().getFullYear()===opts.year &&
                         new Date().getMonth()===monthIdx &&
                         new Date().getDate()===dayNum);
        if (isToday) {
          ctx.beginPath(); ctx.arc(cx+NUM_FONT, cy+NUM_FONT*1.1, NUM_FONT*0.85, 0, Math.PI*2);
          ctx.fillStyle = C.indigoMid; ctx.fill();
          ctx.fillStyle = C.gold;
        } else {
          ctx.fillStyle = numColor;
        }
        ctx.font = `bold ${NUM_FONT}px ${KO_FONT}`;
        ctx.fillText(String(dayNum), cx + NUM_FONT*0.3, cy + NUM_FONT*1.35);

        // 음력 (간략 표시)
        if (!isWeekend && CELL_H > 60) {
          ctx.fillStyle = C.textLight;
          ctx.font = `${NUM_FONT*0.55}px ${KO_FONT}`;
          ctx.fillText('음력', cx+4, cy + CELL_H - 6);
        }
      }
    }
  }
}

// ── 주간 플래너 ─────────────────────────────────────────────────────────────
function drawWeekly(ctx: CanvasRenderingContext2D, W: number, H: number,
                    opts: PlannerOptions, weekLabel: string) {
  const isL = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0,0,W,H);

  // 헤더
  const BAR_H = isL ? H*0.09 : H*0.055;
  ctx.fillStyle = C.indigoDeep;
  ctx.fillRect(0,0,W,BAR_H);

  ctx.fillStyle = C.gold;
  ctx.font = `bold ${BAR_H*0.55}px ${KO_FONT}`;
  ctx.fillText(weekLabel, 50, BAR_H*0.72);

  ctx.fillStyle = C.whiteSoft;
  ctx.font = `${BAR_H*0.28}px ${KO_FONT}`;
  ctx.fillText('주간 계획', W-130, BAR_H*0.68);

  // 왼쪽 목표/이번주 섹션 (세로) or 상단 (가로)
  const PAD = 14;
  let CONTENT_Y = BAR_H + PAD;

  if (!isL) {
    // 이번 주 목표 박스
    const GOAL_H = H * 0.065;
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.indigo200;
    ctx.lineWidth = 1;
    ctx.fillRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.strokeRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);

    ctx.fillStyle = C.indigoMid;
    ctx.font = `bold ${GOAL_H*0.32}px ${KO_FONT}`;
    ctx.fillText('이번 주 목표', PAD+10, CONTENT_Y + GOAL_H*0.55);

    ctx.fillStyle = C.ruleLight;
    ctx.beginPath(); ctx.moveTo(PAD+100, CONTENT_Y); ctx.lineTo(PAD+100, CONTENT_Y+GOAL_H);
    ctx.lineWidth=0.5; ctx.stroke();

    CONTENT_Y += GOAL_H + PAD;
  }

  // 요일 컬럼
  const DAYS_FULL = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];
  const COLS = 7;
  const COL_W = (W - PAD*2) / COLS;
  const CONTENT_H = H - CONTENT_Y - PAD;

  // 요일 헤더
  const DAY_H = isL ? CONTENT_H*0.11 : CONTENT_H*0.08;
  const DAY_COL_BG = [C.indigoLight, C.indigoDeep,C.indigoDeep,C.indigoDeep,C.indigoDeep,C.indigoDeep,'#1d4ed8'];
  const DAY_COLORS2= [C.white, C.gold, C.gold, C.gold, C.gold, C.gold, C.white];
  const FONT_DAY2 = DAY_H * 0.35;

  for (let d=0; d<7; d++) {
    ctx.fillStyle = DAY_COL_BG[d];
    ctx.fillRect(PAD + d*COL_W, CONTENT_Y, COL_W-1, DAY_H);
    ctx.fillStyle = DAY_COLORS2[d];
    ctx.font = `bold ${FONT_DAY2}px ${KO_FONT}`;
    const dw = ctx.measureText(isL ? DAYS_FULL[d] : DAYS_KO[d]).width;
    ctx.fillText(isL ? DAYS_FULL[d] : DAYS_KO[d],
      PAD + d*COL_W + (COL_W-dw)/2, CONTENT_Y + DAY_H*0.68);
  }

  // 각 요일 셀 (줄 기반)
  const LINES_START = CONTENT_Y + DAY_H + 1;
  const LINES_H = H - LINES_START - PAD;
  const LINE_COUNT = isL ? 18 : 22;
  const LINE_H = LINES_H / LINE_COUNT;

  for (let row=0; row<LINE_COUNT; row++) {
    const ly = LINES_START + row * LINE_H;
    ctx.strokeStyle = row % 2 === 0 ? C.ruleLight : '#e8eef8';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD, ly); ctx.lineTo(W-PAD, ly); ctx.stroke();
  }

  // 세로 컬럼 구분선
  for (let d=1; d<7; d++) {
    ctx.strokeStyle = C.indigo200;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(PAD + d*COL_W, CONTENT_Y);
    ctx.lineTo(PAD + d*COL_W, H-PAD);
    ctx.stroke();
  }
}

// ── 일간 플래너 ─────────────────────────────────────────────────────────────
function drawDaily(ctx: CanvasRenderingContext2D, W: number, H: number,
                   opts: PlannerOptions) {
  const isL = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0,0,W,H);

  // 헤더
  const BAR_H = isL ? H*0.09 : H*0.055;
  const grad = ctx.createLinearGradient(0,0,W,0);
  grad.addColorStop(0, C.indigoDeep);
  grad.addColorStop(1, C.indigoMid);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,W,BAR_H);

  ctx.fillStyle = C.gold;
  ctx.font = `bold ${BAR_H*0.5}px ${KO_FONT}`;
  ctx.fillText('일간 계획', 50, BAR_H*0.70);

  ctx.fillStyle = C.whiteSoft;
  ctx.font = `${BAR_H*0.28}px ${KO_FONT}`;
  ctx.fillText('DAILY PLANNER', W-170, BAR_H*0.68);

  // 날짜 입력 영역
  const PAD = 14;
  const DATE_Y = BAR_H + PAD;
  const DATE_H = isL ? H*0.075 : H*0.048;

  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ruleLight;
  ctx.lineWidth = 1;
  ctx.fillRect(PAD, DATE_Y, W-PAD*2, DATE_H);
  ctx.strokeRect(PAD, DATE_Y, W-PAD*2, DATE_H);

  const FONT_DATE_LABEL = DATE_H*0.35;
  ctx.fillStyle = C.indigoMid;
  ctx.font = `bold ${FONT_DATE_LABEL}px ${KO_FONT}`;
  ctx.fillText(String(opts.year)+'년', PAD+10, DATE_Y + DATE_H*0.65);

  // 월 / 일 필드
  for (const [label, x] of [['월', W*0.22], ['일', W*0.38], ['요일', W*0.54]] as [string,number][]) {
    ctx.strokeStyle = C.goldDim;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, DATE_Y+DATE_H*0.75); ctx.lineTo(x+50, DATE_Y+DATE_H*0.75); ctx.stroke();
    ctx.fillStyle = C.textLight;
    ctx.font = `${FONT_DATE_LABEL*0.75}px ${KO_FONT}`;
    ctx.fillText(label, x+55, DATE_Y+DATE_H*0.7);
  }

  // 오늘의 한마디
  const QUOTE_Y = DATE_Y + DATE_H + PAD;
  const QUOTE_H = isL ? H*0.07 : H*0.045;
  ctx.fillStyle = C.indigo100;
  ctx.fillRect(PAD, QUOTE_Y, W-PAD*2, QUOTE_H);
  ctx.fillStyle = C.indigoMid;
  ctx.font = `bold ${QUOTE_H*0.35}px ${KO_FONT}`;
  ctx.fillText('✦ 오늘의 한마디', PAD+10, QUOTE_Y+QUOTE_H*0.65);

  // 시간대 블록
  const TIME_START_Y = QUOTE_Y + QUOTE_H + PAD;
  const TIME_END_Y   = H - PAD;

  // 가로모드: 두 컬럼으로 시간대 분할
  const HOURS = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const TIME_COLORS: Record<string,string> = {
    '6':'#ecf5ff','7':'#ecf5ff','8':'#ecf5ff',
    '9':'#fffbeb','10':'#fffbeb','11':'#fffbeb',
    '12':'#f0fdf4','13':'#f0fdf4',
    '14':'#f8f9ff','15':'#f8f9ff','16':'#f8f9ff','17':'#f8f9ff',
    '18':'#faf5ff','19':'#faf5ff','20':'#faf5ff',
    '21':'#f1f5f9','22':'#f1f5f9',
  };

  const SPLIT = isL ? Math.ceil(HOURS.length/2) : HOURS.length;
  const COL_COUNT = isL ? 2 : 1;
  const COL_W = (W-PAD*2) / COL_COUNT;
  const TIME_H = (TIME_END_Y - TIME_START_Y) / Math.ceil(HOURS.length / COL_COUNT);

  const FONT_TIME = Math.min(TIME_H*0.38, 18);
  const TIME_LABEL_W = isL ? 58 : 52;

  for (let i=0; i<HOURS.length; i++) {
    const col = isL && i >= SPLIT ? 1 : 0;
    const row = isL && i >= SPLIT ? i - SPLIT : i;
    const tx = PAD + col * COL_W;
    const ty = TIME_START_Y + row * TIME_H;
    const tw2 = COL_W - 1;

    ctx.fillStyle = TIME_COLORS[String(HOURS[i])] || C.bgCell;
    ctx.fillRect(tx, ty, tw2, TIME_H-1);
    ctx.strokeStyle = C.ruleLight; ctx.lineWidth=0.5;
    ctx.strokeRect(tx, ty, tw2, TIME_H-1);

    // 시간 라벨
    ctx.fillStyle = C.indigoMid;
    ctx.font = `bold ${FONT_TIME}px ${KO_FONT}`;
    ctx.fillText(`${HOURS[i]}:00`, tx+6, ty + TIME_H*0.62);

    // 구분선
    ctx.strokeStyle = C.indigo200; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(tx+TIME_LABEL_W, ty); ctx.lineTo(tx+TIME_LABEL_W, ty+TIME_H-1); ctx.stroke();
  }

  // 오른쪽 노트 패널 (세로모드만, 전체 높이의 20%)
  if (!isL) {
    const NOTE_X = W*0.72;
    const NOTE_Y = TIME_START_Y;
    const NOTE_W = W - NOTE_X - PAD;
    const NOTE_H = TIME_END_Y - NOTE_Y;

    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.indigo200;
    ctx.lineWidth=1;
    ctx.fillRect(NOTE_X, NOTE_Y, NOTE_W, NOTE_H);
    ctx.strokeRect(NOTE_X, NOTE_Y, NOTE_W, NOTE_H);

    ctx.fillStyle = C.indigoDeep;
    ctx.font = `bold 16px ${KO_FONT}`;
    ctx.fillText('메모', NOTE_X+8, NOTE_Y+22);

    ctx.strokeStyle = C.ruleLight; ctx.lineWidth=0.5;
    for (let r=1; r<=10; r++) {
      const ly = NOTE_Y + NOTE_H/11 * r;
      ctx.beginPath(); ctx.moveTo(NOTE_X+4, ly); ctx.lineTo(NOTE_X+NOTE_W-4, ly); ctx.stroke();
    }
  }
}

// ── roundRect 헬퍼 ─────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number,
                   w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

// ════════════════════════════════════════════════════════════════════════════
//  PUBLIC API
// ════════════════════════════════════════════════════════════════════════════

export async function generatePlannerPDF(opts: PlannerOptions): Promise<void> {
  const { jsPDF } = await import('jspdf');

  const isL = opts.orientation === 'landscape';
  const CW = isL ? PORTRAIT_H : PORTRAIT_W;  // canvas px
  const CH = isL ? PORTRAIT_W : PORTRAIT_H;
  // jsPDF A4 pt: portrait 595×842, landscape 842×595
  const PW = isL ? 842 : 595;
  const PH = isL ? 595 : 842;

  const doc = new jsPDF({
    orientation: opts.orientation,
    unit: 'pt',
    format: 'a4',
  });

  const canvas = document.createElement('canvas');
  canvas.width  = CW;
  canvas.height = CH;
  const ctx = canvas.getContext('2d')!;

  const expandedPages: { type: PageType; label: string; idx?: number }[] = [];

  for (const p of opts.pages) {
    if (p === 'monthly') {
      for (let m=0; m<12; m++) {
        expandedPages.push({ type:'monthly', label: MONTHS_KO[m]+'간 플래너', idx:m });
      }
    } else if (p === 'weekly') {
      for (let w=1; w<=52; w++) {
        expandedPages.push({ type:'weekly', label:`${w}주차`, idx:w });
      }
    } else if (p === 'daily') {
      expandedPages.push({ type:'daily', label:'일간 플래너 샘플' });
    } else if (p === 'cover') {
      expandedPages.push({ type:'cover', label:'커버 페이지' });
    } else if (p === 'year-index') {
      expandedPages.push({ type:'year-index', label:'연간 인덱스' });
    }
  }

  const total = expandedPages.length;

  for (let i=0; i<expandedPages.length; i++) {
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
      const label = `${opts.year}년 ${page.idx!}주차`;
      drawWeekly(ctx, CW, CH, opts, label);
    } else if (page.type === 'daily') {
      drawDaily(ctx, CW, CH, opts);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.88);
    if (i > 0) doc.addPage([PW, PH], opts.orientation);
    doc.addImage(imgData, 'JPEG', 0, 0, PW, PH);
  }

  doc.save(`fortunetab_${opts.year}_planner_${opts.orientation}.pdf`);
}
