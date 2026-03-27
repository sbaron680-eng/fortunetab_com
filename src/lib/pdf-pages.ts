/**
 * FortuneTab PDF Page Drawers
 * 5개 페이지 draw 함수 (drawCover ~ drawDaily)
 */

import { getHoliday, getSolarTerm } from './korean-holidays';
import { PHILOSOPHIES, getMonthPhilosophy } from './planner-philosophy';
import {
  themeHolder,
  C, F, NAV_H_RATIO, PAGE_PAD,
  MONTHS_KO, DAYS_KO, DAYS_WEEK_SHORT, DAYS_WEEK_FULL,
  centeredText, firstDayOf, daysInMonth,
  roundRect, getISOWeek, getWeekDates,
  drawBrushStrokes, drawSeasonPictos, drawNavBar,
  type PageType, type NavLink, type PlannerOptions,
} from './pdf-utils';

// ════════════════════════════════════════════════════════════════════════════
//  PAGE DRAWERS
// ════════════════════════════════════════════════════════════════════════════

export function drawCover(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
  const T = themeHolder.T;
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  // ── 배경: 한지 화이트 ────────────────────────────────────────────────────
  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0, 0, W, CH);

  // ── 상단 단청 띠 ─────────────────────────────────────────────────────────
  const topBandH = isL ? CH * 0.06 : CH * 0.04;
  ctx.fillStyle = T.coverDeep;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 0, W, topBandH);
  ctx.globalAlpha = 1;

  // ── 추상 브러시 스트로크 배경 ──────────────────────────────────────────
  drawBrushStrokes(ctx, W, CH, T.coverMid);

  // ── 세로 중심선 (선비/병풍 분할) ─────────────────────────────────────────
  if (!isL) {
    ctx.beginPath();
    ctx.moveTo(W / 2, CH * 0.12);
    ctx.lineTo(W / 2, CH * 0.82);
    ctx.strokeStyle = T.coverDeep;
    ctx.globalAlpha = 0.08;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── 제목 블록 ────────────────────────────────────────────────────────────
  if (!isL) {
    // 브랜드 서브타이틀
    ctx.font = F(22, false, false);
    ctx.fillStyle = C.goldFaint;
    ctx.globalAlpha = 0.8;
    centeredText(ctx, 'fortunetab', CH * 0.285, W);
    ctx.globalAlpha = 1;

    // 수평 구분선
    ctx.beginPath();
    ctx.moveTo(W * 0.25, CH * 0.310);
    ctx.lineTo(W * 0.75, CH * 0.310);
    ctx.strokeStyle = T.coverDeep;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 연도 대형 타이포
    const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
    if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0.05em';
    ctx.font = F(W * 0.155, true, true);
    ctx.fillStyle = T.coverDeep;
    ctx.globalAlpha = 0.85;
    centeredText(ctx, String(opts.year), CH * 0.52, W);
    ctx.globalAlpha = 1;
    if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0em';

    // 플래너 부제 (모드별 분기)
    ctx.font = F(32, true, true);
    ctx.fillStyle = C.textDark;
    const coverTitle = opts.mode === 'practice'
      ? '계획하는 사람들을 위한 플래너'
      : '나만의 365일 플래너';
    centeredText(ctx, coverTitle, CH * 0.588, W);

    ctx.font = F(20, false, false);
    ctx.fillStyle = C.textLight;
    const coverSub = opts.mode === 'practice'
      ? '목표 달성 · 습관 형성 · 실천력 강화'
      : `사주로 읽는 ${opts.year}년 운세 일력`;
    centeredText(ctx, coverSub, CH * 0.634, W);

    // 하단 구분선
    ctx.beginPath();
    ctx.moveTo(W * 0.25, CH * 0.658);
    ctx.lineTo(W * 0.75, CH * 0.658);
    ctx.strokeStyle = T.coverDeep;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 철학 인용구 (하단 구분선 아래 · 이름 위)
    const philCover = opts.mode === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[1];
    ctx.font = F(14, false, true);
    ctx.fillStyle = T.coverMid;
    ctx.globalAlpha = 0.65;
    centeredText(ctx, philCover.quote, CH * 0.698, W);
    ctx.globalAlpha = 1;

    // 이름 라인
    const FX = (W - 480) / 2;
    const LINE_Y = CH * 0.768;
    ctx.font = F(18, false, false); ctx.fillStyle = C.goldFaint;
    ctx.fillText('이름', FX, LINE_Y - 28);
    ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX+480, LINE_Y);
    ctx.strokeStyle = T.coverMid; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX, LINE_Y-6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(FX+480, LINE_Y); ctx.lineTo(FX+480, LINE_Y-6); ctx.stroke();
    if (opts.name) {
      ctx.font = F(26, true, true); ctx.fillStyle = C.textDark;
      ctx.fillText(opts.name, FX+8, LINE_Y - 6);
    }

    // 사주 박스
    if (opts.saju) {
      const s = opts.saju;
      const SX = (W - 480) / 2, SY = CH * 0.800;
      ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.06;
      roundRect(ctx, SX, SY, 480, 80, 8); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
      roundRect(ctx, SX, SY, 480, 80, 8); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = F(13, false, false); ctx.fillStyle = C.textLight;
      centeredText(ctx, '사주팔자', SY + 16, W);
      ctx.font = F(17, true, true); ctx.fillStyle = C.textDark;
      centeredText(ctx, `${s.yearPillar}년  ${s.monthPillar}월  ${s.dayPillar}일  ${s.hourPillar}시`, SY + 42, W);
      ctx.font = F(12, false, false); ctx.fillStyle = C.textLight;
      centeredText(ctx, `일간 ${s.dayElem} · 용신 ${s.yongsin} · ${s.elemSummary}`, SY + 64, W);
    }

    // 계절 픽토그램 4개
    const pictoY = opts.saju ? CH * 0.916 : CH * 0.878;
    drawSeasonPictos(ctx, W / 2, pictoY, T.coverDeep, 22);

  } else {
    // ── 가로형 ────────────────────────────────────────────────────────────
    ctx.fillStyle = T.coverDeep;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, W * 0.08, CH);
    ctx.globalAlpha = 1;

    const RX = W * 0.15, RW = W * 0.75;

    ctx.font = F(26, false, false); ctx.fillStyle = C.goldFaint;
    ctx.globalAlpha = 0.75;
    const bw = ctx.measureText('fortunetab').width;
    ctx.fillText('fortunetab', RX+(RW-bw)/2, CH*0.28);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(RX + RW*0.1, CH*0.32);
    ctx.lineTo(RX + RW*0.9, CH*0.32);
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = F(CH*0.28, true, true);
    ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.85;
    const yw = ctx.measureText(String(opts.year)).width;
    ctx.fillText(String(opts.year), RX+(RW-yw)/2, CH*0.67);
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(RX + RW*0.1, CH*0.70);
    ctx.lineTo(RX + RW*0.9, CH*0.70);
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.8; ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.font = F(22, true, true); ctx.fillStyle = C.textDark;
    const lCoverTitle = opts.mode === 'practice'
      ? '계획하는 사람들을 위한 플래너'
      : '사주·운세로 설계한 나만의 플래너';
    const tw = ctx.measureText(lCoverTitle).width;
    ctx.fillText(lCoverTitle, RX+(RW-tw)/2, CH*0.78);

    // 철학 인용구 (가로형)
    const lPhil = opts.mode === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[1];
    ctx.font = F(13, false, true); ctx.fillStyle = T.coverMid;
    ctx.globalAlpha = 0.60;
    const lpw = ctx.measureText(lPhil.shortQuote).width;
    ctx.fillText(lPhil.shortQuote, RX+(RW-lpw)/2, CH*0.825);
    ctx.globalAlpha = 1;

    const FX2 = RX + RW*0.12, FW2 = RW*0.76;
    ctx.font = F(18, false, false); ctx.fillStyle = C.textLight;
    ctx.fillText('이름', FX2, CH*0.855);
    ctx.beginPath(); ctx.moveTo(FX2, CH*0.895); ctx.lineTo(FX2+FW2, CH*0.895);
    ctx.strokeStyle = T.coverMid; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke();
    ctx.globalAlpha = 1;
    if (opts.name) {
      ctx.font = F(22, true, true); ctx.fillStyle = C.textDark;
      ctx.fillText(opts.name, FX2+6, CH*0.890);
    }

    drawSeasonPictos(ctx, RX + RW/2, CH * 0.945, T.coverDeep, 18);
  }

  // ── 하단 단청 띠 ─────────────────────────────────────────────────────────
  const botBandH = isL ? CH * 0.04 : CH * 0.028;
  ctx.fillStyle = T.coverDeep;
  ctx.globalAlpha = 0.10;
  ctx.fillRect(0, CH - botBandH, W, botBandH);
  ctx.globalAlpha = 1;

  drawNavBar(ctx, W, H, 'cover', opts.pages);
}


export function drawYearIndex(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
): NavLink[] {
  const T = themeHolder.T;
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
  ctx.fillText(String(opts.year), PAGE_PAD, TEXT_Y);
  const yearW = ctx.measureText(String(opts.year)).width;

  ctx.font = F(FONT_TITLE, false, false);
  ctx.fillStyle = 'rgba(255,230,240,0.75)';
  ctx.fillText('연간 인덱스', PAGE_PAD + yearW + 16, TEXT_Y - FONT_TITLE*0.05);

  // 철학 ① — 헤더 우측 정렬 (fortune) / ④ (practice)
  const yiPhil = opts.mode === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[0];
  ctx.font = F(FONT_TITLE * 0.82, false, true);
  ctx.fillStyle = C.goldFaint;
  ctx.globalAlpha = 0.60;
  const yiPhilW = ctx.measureText(yiPhil.shortQuote).width;
  ctx.fillText(yiPhil.shortQuote, W - PAGE_PAD - yiPhilW, TEXT_Y - FONT_TITLE * 0.05);
  ctx.globalAlpha = 1;

  // ── 실천 플래너: 연간 목표 + 분기별 계획 ──────────────────────────────────
  if (opts.mode === 'practice') {
    const OUTER = PAGE_PAD;
    const GAP   = isL ? 14 : 10;
    void GAP; // 사용하지 않는 변수 lint 방지
    const contentY = BAR_H + (isL ? 18 : 16);
    const contentH = CH - contentY - OUTER;

    // 연간 목표 섹션 (위쪽 35%)
    const goalH = contentH * 0.35;
    const goalBoxY = contentY;

    // 섹션 헤더
    ctx.font = F(isL ? 22 : 20, true, false); ctx.fillStyle = T.headerA;
    ctx.fillText(`${opts.year}년 나의 3가지 목표`, OUTER, goalBoxY + (isL ? 22 : 20));

    // 목표 3개 입력 라인
    const goalLineGap = (goalH - (isL ? 36 : 30)) / 3;
    for (let i = 0; i < 3; i++) {
      const lx = OUTER;
      const ly = goalBoxY + (isL ? 44 : 38) + i * goalLineGap;
      // 번호
      ctx.font = F(isL ? 18 : 16, true, true); ctx.fillStyle = T.headerA;
      ctx.globalAlpha = 0.85;
      ctx.fillText(`${i + 1}.`, lx, ly + (isL ? 18 : 15));
      ctx.globalAlpha = 1;
      // 입력 라인
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(lx + 28, ly + (isL ? 20 : 18)); ctx.lineTo(W - OUTER, ly + (isL ? 20 : 18)); ctx.stroke();
    }

    // 철학 ① 인용 (목표 섹션 하단)
    ctx.font = F(isL ? 13 : 12, false, true);
    ctx.fillStyle = C.textLight; ctx.globalAlpha = 0.65;
    centeredText(ctx, PHILOSOPHIES[0].quote, goalBoxY + goalH - 4, W);
    ctx.globalAlpha = 1;

    // 분기별 계획 그리드 (아래쪽 60%)
    const QY   = contentY + goalH + (isL ? 16 : 12);
    const QGAP = isL ? 14 : 10;
    const QW   = (W - OUTER * 2 - QGAP * 3) / 4;
    const QH   = CH - QY - OUTER;
    const Q_MONTHS = ['1월 — 3월', '4월 — 6월', '7월 — 9월', '10월 — 12월'];

    for (let q = 0; q < 4; q++) {
      const qx = OUTER + q * (QW + QGAP);
      const qy = QY;

      // 분기 카드 배경
      ctx.fillStyle = C.bgCard;
      roundRect(ctx, qx, qy, QW, QH, 8); ctx.fill();
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
      roundRect(ctx, qx, qy, QW, QH, 8); ctx.stroke();

      // 분기 헤더 그라디언트
      const qHdrH = QH * 0.14;
      const qhg = ctx.createLinearGradient(qx, qy, qx + QW, qy);
      qhg.addColorStop(0, T.headerA); qhg.addColorStop(1, T.headerB);
      ctx.fillStyle = qhg;
      roundRect(ctx, qx, qy, QW, qHdrH + 4, 8); ctx.fill();
      ctx.fillRect(qx, qy + qHdrH / 2, QW, qHdrH / 2 + 4);

      // Q 라벨
      ctx.font = F(QH * 0.09, true, true); ctx.fillStyle = C.goldFaint;
      const qlW = ctx.measureText(`Q${q + 1}`).width;
      ctx.fillText(`Q${q + 1}`, qx + (QW - qlW) / 2, qy + qHdrH * 0.80);

      // 월 범위
      ctx.font = F(QH * 0.055, false, false); ctx.fillStyle = C.textMid;
      const qmW = ctx.measureText(Q_MONTHS[q]).width;
      ctx.fillText(Q_MONTHS[q], qx + (QW - qmW) / 2, qy + qHdrH + QH * 0.06);

      // 목표/계획 입력 라인 (6줄)
      const lineAreaY = qy + qHdrH + QH * 0.12;
      const lineAreaH = QH - qHdrH - QH * 0.14;
      const lineGap   = lineAreaH / 6;
      const LABELS    = ['목표', '', '', '계획', '', ''];
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.7;
      for (let r = 0; r < 6; r++) {
        const ry = lineAreaY + r * lineGap + lineGap * 0.85;
        if (LABELS[r]) {
          ctx.font = F(lineGap * 0.28, true, false); ctx.fillStyle = T.headerA;
          ctx.globalAlpha = 0.75;
          ctx.fillText(LABELS[r], qx + 7, ry);
          ctx.globalAlpha = 1;
        }
        ctx.beginPath(); ctx.moveTo(qx + 7, ry + 3); ctx.lineTo(qx + QW - 7, ry + 3); ctx.stroke();
      }
    }

    drawNavBar(ctx, W, H, 'year-index', opts.pages);
    return navLinks;
  }

  // 12달 그리드 (fortune 모드)
  const COLS   = isL ? 4 : 3;
  const ROWS   = isL ? 3 : 4;
  const OUTER  = PAGE_PAD;
  const GAP    = isL ? 14 : 10;

  const GX     = OUTER;
  const GY     = BAR_H + (isL ? 18 : 14);
  const CW_    = (W - OUTER*2 - GAP*(COLS-1)) / COLS;
  const CELL_H = (CH - GY - (isL ? 12 : 10)) / ROWS;

  const FM  = Math.min(CW_*0.18, isL ? CH*0.046 : CH*0.027);
  const FDH = Math.min(CW_*0.095, isL ? CH*0.022 : CH*0.015);
  const FDN = Math.min(CW_*0.085, isL ? CH*0.020 : CH*0.014);

  for (let m = 0; m < 12; m++) {
    const col = m % COLS;
    const row = Math.floor(m / COLS);
    const cx2 = GX + col*(CW_+GAP);
    const cy2 = GY + row*(CELL_H+(isL?14:10));

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


export function drawMonthly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  monthIdx: number,
): NavLink[] {
  const T = themeHolder.T;
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
  ctx.fillText(MONTHS_KO[monthIdx], PAGE_PAD, BAR_H*0.70);
  const mw = ctx.measureText(MONTHS_KO[monthIdx]).width;
  ctx.font = F(BAR_H*0.28, false, false);
  ctx.fillStyle = 'rgba(255,225,235,0.75)';
  ctx.fillText(String(opts.year), PAGE_PAD + mw + 14, BAR_H*0.67);

  // 이전/다음 달 화살표 (헤더 우측)
  const ARW   = Math.round(BAR_H * 1.4);  // 화살표 터치 영역 너비
  const ARF   = BAR_H * 0.44;             // 화살표 폰트 크기
  const prevX = W - ARW * 2 - 6;
  const nextX = W - ARW - 4;
  ctx.font = F(ARF, false, false);
  if (monthIdx > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.fillText('◀', prevX + (ARW - ctx.measureText('◀').width) / 2, BAR_H * 0.70);
    navLinks.push({ x: prevX, y: 0, w: ARW, h: BAR_H, targetType: 'monthly', targetIdx: monthIdx - 1 });
  }
  if (monthIdx < 11) {
    ctx.fillStyle = 'rgba(255,255,255,0.60)';
    ctx.fillText('▶', nextX + (ARW - ctx.measureText('▶').width) / 2, BAR_H * 0.70);
    navLinks.push({ x: nextX, y: 0, w: ARW, h: BAR_H, targetType: 'monthly', targetIdx: monthIdx + 1 });
  }

  // 철학 배너 (헤더 바로 아래, 달력 위)
  const PAD    = PAGE_PAD;
  const GX     = PAD;
  const BANNER_H = 24;
  const BANNER_Y = BAR_H + 3;
  const monthPhil = getMonthPhilosophy(monthIdx);
  ctx.fillStyle = T.headerA;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(PAD, BANNER_Y, W - PAD*2, BANNER_H);
  ctx.globalAlpha = 1;
  ctx.font = F(11, false, true);
  ctx.fillStyle = T.headerA;
  ctx.globalAlpha = 0.70;
  ctx.fillText(`✦  ${monthPhil.shortQuote}`, PAD + 10, BANNER_Y + BANNER_H * 0.73);
  ctx.globalAlpha = 1;

  const GY     = BANNER_Y + BANNER_H + (isL ? 5 : 4);
  // 실천 모드 세로형: 달력 63% 너비 → 오른쪽 OKR 패널 확보
  const CAL_RATIO = (opts.mode === 'practice' && !isL) ? 0.63 : 1.0;
  const CAL_W  = (W - PAD * 2) * CAL_RATIO;
  const CELL_W = CAL_W / 7;
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
        w: CAL_W, h: CELL_H,
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
          ctx.font = F(NF, true, true); ctx.fillStyle = C.goldFaint;
        } else {
          ctx.font = F(NF, true, true);
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

  // ── 실천 플래너 세로형: 오른쪽 OKR 패널 ──────────────────────────────────
  if (opts.mode === 'practice' && !isL) {
    const OKR_X = PAD + CAL_W + 12;
    const OKR_W = W - OKR_X - PAD;
    const OKR_Y = GY;
    const OKR_H = CH - OKR_Y - PAD;

    // OKR 패널 — 위쪽 55%: 이달의 목표
    const OKR_TOP_H = OKR_H * 0.54;
    ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
    roundRect(ctx, OKR_X, OKR_Y, OKR_W, OKR_TOP_H, 8); ctx.fill(); ctx.stroke();

    // OKR 헤더
    const oHdrH = OKR_TOP_H * 0.13;
    const ohg = ctx.createLinearGradient(OKR_X, OKR_Y, OKR_X + OKR_W, OKR_Y);
    ohg.addColorStop(0, T.headerA); ohg.addColorStop(1, T.headerB);
    ctx.fillStyle = ohg;
    roundRect(ctx, OKR_X, OKR_Y, OKR_W, oHdrH + 4, 8); ctx.fill();
    ctx.fillRect(OKR_X, OKR_Y + oHdrH / 2, OKR_W, oHdrH / 2 + 4);
    ctx.font = F(oHdrH * 0.62, true, false); ctx.fillStyle = C.goldFaint;
    ctx.fillText('이달의 목표', OKR_X + 8, OKR_Y + oHdrH * 0.78);

    // OKR 입력 라인 (목표 + KR 3개)
    const oLineStart = OKR_Y + oHdrH + 6;
    const oLineH = (OKR_TOP_H - oHdrH - 10) / 4;
    const OKR_LABELS = ['목표', 'KR 1', 'KR 2', 'KR 3'];
    ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const oly = oLineStart + i * oLineH;
      ctx.font = F(oLineH * 0.26, true, false); ctx.fillStyle = T.headerA;
      ctx.globalAlpha = 0.80;
      ctx.fillText(OKR_LABELS[i], OKR_X + 6, oly + oLineH * 0.52);
      ctx.globalAlpha = 1;
      const labelW = ctx.measureText(OKR_LABELS[i]).width + 10;
      ctx.beginPath();
      ctx.moveTo(OKR_X + labelW, oly + oLineH * 0.56);
      ctx.lineTo(OKR_X + OKR_W - 6, oly + oLineH * 0.56);
      ctx.stroke();
    }

    // OKR 패널 — 아래쪽 42%: 월말 회고
    const REV_Y = OKR_Y + OKR_TOP_H + 8;
    const REV_H = OKR_H - OKR_TOP_H - 8;
    ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
    roundRect(ctx, OKR_X, REV_Y, OKR_W, REV_H, 8); ctx.fill(); ctx.stroke();

    ctx.font = F(REV_H * 0.085, true, false); ctx.fillStyle = T.headerA;
    ctx.fillText('이달의 회고', OKR_X + 8, REV_Y + REV_H * 0.11);

    const rLineStart = REV_Y + REV_H * 0.18;
    const rLineH = (REV_H * 0.78) / 4;
    const REV_LABELS = ['잘한 점', '개선점', '배운 것', '다음 달'];
    ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      const rly = rLineStart + i * rLineH;
      ctx.font = F(rLineH * 0.25, true, false); ctx.fillStyle = T.headerA;
      ctx.globalAlpha = 0.75;
      ctx.fillText(REV_LABELS[i], OKR_X + 6, rly + rLineH * 0.42);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(OKR_X + 6, rly + rLineH * 0.56);
      ctx.lineTo(OKR_X + OKR_W - 6, rly + rLineH * 0.56);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(OKR_X + 6, rly + rLineH * 0.80);
      ctx.lineTo(OKR_X + OKR_W - 6, rly + rLineH * 0.80);
      ctx.stroke();
    }
  }

  drawNavBar(ctx, W, H, 'monthly', opts.pages);
  return navLinks;
}


export function drawWeekly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  weekNum: number,
): void {
  const T = themeHolder.T;
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
  ctx.fillText(`${opts.year}년 ${weekNum}주차`, PAGE_PAD, BAR_H*0.70);
  ctx.font = F(BAR_H*0.27, false, false); ctx.fillStyle = T.weeklyAccent;
  const rangeStr = `${fmtMD(mon)} ~ ${fmtMD(sun)}`;
  ctx.fillText(rangeStr, W - PAGE_PAD - ctx.measureText(rangeStr).width, BAR_H*0.68);

  // 이번 주 목표 (세로 전용)
  const PAD = PAGE_PAD;
  let CONTENT_Y = BAR_H + PAD;

  if (!isL) {
    const GOAL_H = CH * 0.058;
    ctx.fillStyle = T.wkDayBgMid; ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 1;
    ctx.fillRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.strokeRect(PAD, CONTENT_Y, W-PAD*2, GOAL_H);
    ctx.font = F(GOAL_H*0.34, true, false); ctx.fillStyle = T.weeklyA;
    ctx.fillText('이번 주 목표', PAD+10, CONTENT_Y+GOAL_H*0.66);
    const goalLabelW = ctx.measureText('이번 주 목표').width;
    ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(PAD + goalLabelW + 20, CONTENT_Y); ctx.lineTo(PAD + goalLabelW + 20, CONTENT_Y+GOAL_H);
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


export function drawDaily(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
  const T = themeHolder.T;
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
  ctx.fillText('일간 계획', PAGE_PAD, BAR_H*0.70);
  ctx.font = F(BAR_H*0.26, false, false); ctx.fillStyle = 'rgba(255,225,235,0.8)';
  const dpLabel = 'DAILY PLANNER';
  ctx.fillText(dpLabel, W - PAGE_PAD - ctx.measureText(dpLabel).width, BAR_H*0.68);

  // 날짜 입력 영역
  const PAD    = PAGE_PAD;
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

  // 오늘의 다짐 (철학 의도 포함)
  const QUOTE_Y = DATE_Y + DATE_H + PAD;
  const QUOTE_H = isL ? CH*0.066 : CH*0.050;
  ctx.fillStyle = T.dayBgSun;
  ctx.fillRect(PAD, QUOTE_Y, W-PAD*2, QUOTE_H);
  ctx.font = F(QUOTE_H*0.32, true, true); ctx.fillStyle = T.headerA;
  ctx.fillText('✦ 오늘의 다짐', PAD+12, QUOTE_Y+QUOTE_H*0.42);
  // 철학 의도 (④ 실행 철학 고정 — 일간 플래너 핵심 철학)
  const dailyPhil = opts.mode === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[((opts.year) % 4 + 4) % 4];
  ctx.font = F(QUOTE_H*0.26, false, true); ctx.fillStyle = T.headerA;
  ctx.globalAlpha = 0.72;
  ctx.fillText(dailyPhil.intent, PAD + 12, QUOTE_Y + QUOTE_H * 0.80);
  ctx.globalAlpha = 1;

  // ── 실천 플래너: MIT + 습관 체크 섹션 ────────────────────────────────────
  let TIME_Y = QUOTE_Y + QUOTE_H + (isL ? PAD : Math.round(PAD * 0.6));
  if (opts.mode === 'practice') {
    // MIT (Most Important Tasks) 섹션
    const MIT_Y = TIME_Y;
    const MIT_H = isL ? Math.round(CH * 0.115) : Math.round(CH * 0.096);
    ctx.fillStyle = T.wkDayBgMid; ctx.strokeStyle = T.weeklyB + '60'; ctx.lineWidth = 1;
    ctx.fillRect(PAD, MIT_Y, W - PAD * 2, MIT_H);
    ctx.strokeRect(PAD, MIT_Y, W - PAD * 2, MIT_H);

    ctx.font = F(MIT_H * 0.20, true, false); ctx.fillStyle = T.headerA;
    ctx.fillText('오늘의 3 MITs', PAD + 10, MIT_Y + MIT_H * 0.30);

    const MIT_COL_W = (W - PAD * 2) / 3;
    for (let i = 0; i < 3; i++) {
      const mx = PAD + i * MIT_COL_W;
      ctx.font = F(MIT_H * 0.19, false, false); ctx.fillStyle = C.textMid;
      ctx.fillText(`□  ${i + 1}.`, mx + 8, MIT_Y + MIT_H * 0.65);
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(mx + 8, MIT_Y + MIT_H * 0.82);
      ctx.lineTo(mx + MIT_COL_W - 10, MIT_Y + MIT_H * 0.82);
      ctx.stroke();
    }

    // 습관 체크 섹션
    const HAB_Y = MIT_Y + MIT_H + 6;
    const HAB_H = isL ? Math.round(CH * 0.065) : Math.round(CH * 0.055);
    ctx.fillStyle = T.cellBgSat; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
    ctx.fillRect(PAD, HAB_Y, W - PAD * 2, HAB_H);
    ctx.strokeRect(PAD, HAB_Y, W - PAD * 2, HAB_H);

    ctx.font = F(HAB_H * 0.34, true, false); ctx.fillStyle = T.headerA;
    ctx.fillText('습관 체크', PAD + 10, HAB_Y + HAB_H * 0.66);
    const habLabelW = ctx.measureText('습관 체크').width + 20;
    const HABITS = ['□ 운동', '□ 독서', '□ 명상', '□ 감사일기', '□ 수분섭취'];
    const habItemW = (W - PAD * 2 - habLabelW) / HABITS.length;
    ctx.font = F(HAB_H * 0.28, false, false); ctx.fillStyle = C.textMid;
    HABITS.forEach((h, i) => {
      ctx.fillText(h, PAD + habLabelW + i * habItemW, HAB_Y + HAB_H * 0.66);
    });

    TIME_Y = HAB_Y + HAB_H + 6;
  }

  // 시간대 블록
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
