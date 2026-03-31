/**
 * FortuneTab PDF Page Drawers
 * 5개 페이지 draw 함수 (drawCover ~ drawDaily)
 */

import { getHoliday, getSolarTerm } from './korean-holidays';
import { PHILOSOPHIES, getMonthPhilosophy } from './planner-philosophy';
import type { ColorTheme } from './pdf-themes';
import {
  themeHolder,
  C, F, SERIF, SANS, NAV_H_RATIO, PAGE_PAD,
  MONTHS_KO, DAYS_KO, DAYS_WEEK_SHORT, DAYS_WEEK_FULL,
  centeredText, firstDayOf, daysInMonth,
  roundRect, getISOWeek, getWeekDates,
  drawBrushStrokes, drawSeasonPictos, drawNavBar,
  type PageType, type NavLink, type PlannerOptions,
} from './pdf-utils';

// ── 모드별 스타일 토큰 ────────────────────────────────────────────────────────

interface ModeStyle {
  headerSerif: boolean;   // 헤더 폰트 세리프 여부
  accentSymbol: string;   // 장식 심볼
  bannerOpacity: number;  // 배너 배경 불투명도
  decorative: boolean;    // 장식 요소 표시 여부
}

function getModeStyle(mode: PlannerOptions['mode']): ModeStyle {
  if (mode === 'practice') {
    return { headerSerif: false, accentSymbol: '✓', bannerOpacity: 0.04, decorative: false };
  }
  return { headerSerif: true, accentSymbol: '✦', bannerOpacity: 0.07, decorative: true };
}

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
  const style = opts.coverStyle ?? (opts.mode === 'practice' ? 'practice' : 'fortune');

  // ── 공통 배경 ────────────────────────────────────────────────────────────
  ctx.fillStyle = C.bgPage;
  ctx.fillRect(0, 0, W, CH);

  // ── 스타일별 세로형 렌더링 ────────────────────────────────────────────────
  if (!isL) {
    switch (style) {
      case 'premium':
        drawCoverPremium(ctx, W, CH, opts, T);
        break;
      case 'practice':
        drawCoverPractice(ctx, W, CH, opts, T);
        break;
      case 'extras':
        drawCoverExtras(ctx, W, CH, opts, T);
        break;
      case 'allinone':
        drawCoverAllInOne(ctx, W, CH, opts, T);
        break;
      case 'fortune':
      default:
        drawCoverFortune(ctx, W, CH, opts, T);
        break;
    }
  } else {
    // ── 가로형 (모든 스타일 공통) ──────────────────────────────────────────
    const topBandH = CH * 0.06;
    ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, W, topBandH); ctx.globalAlpha = 1;
    drawBrushStrokes(ctx, W, CH, T.coverMid);

    ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.08;
    ctx.fillRect(0, 0, W * 0.08, CH); ctx.globalAlpha = 1;

    const RX = W * 0.15, RW = W * 0.75;

    ctx.font = F(26, false, false); ctx.fillStyle = C.goldFaint;
    ctx.globalAlpha = 0.75;
    const bw = ctx.measureText('fortunetab').width;
    ctx.fillText('fortunetab', RX+(RW-bw)/2, CH*0.28); ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.moveTo(RX + RW*0.1, CH*0.32); ctx.lineTo(RX + RW*0.9, CH*0.32);
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;

    ctx.font = F(CH*0.28, true, true); ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.85;
    const yw = ctx.measureText(String(opts.year)).width;
    ctx.fillText(String(opts.year), RX+(RW-yw)/2, CH*0.67); ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.moveTo(RX + RW*0.1, CH*0.70); ctx.lineTo(RX + RW*0.9, CH*0.70);
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.8; ctx.stroke(); ctx.globalAlpha = 1;

    ctx.font = F(22, true, true); ctx.fillStyle = C.textDark;
    const lCoverTitle = style === 'practice'
      ? '계획하는 사람들을 위한 플래너'
      : style === 'extras' ? '부록 플래너'
      : style === 'allinone' ? '라이프 플래너 올인원'
      : style === 'premium' ? '사주 플래너 프리미엄'
      : '나만의 365일 플래너';
    const tw = ctx.measureText(lCoverTitle).width;
    ctx.fillText(lCoverTitle, RX+(RW-tw)/2, CH*0.78);

    const lPhil = style === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[1];
    ctx.font = F(13, false, true); ctx.fillStyle = T.coverMid;
    ctx.globalAlpha = 0.60;
    const lpw = ctx.measureText(lPhil.shortQuote).width;
    ctx.fillText(lPhil.shortQuote, RX+(RW-lpw)/2, CH*0.825); ctx.globalAlpha = 1;

    const FX2 = RX + RW*0.12, FW2 = RW*0.76;
    ctx.font = F(18, false, false); ctx.fillStyle = C.textLight;
    ctx.fillText('이름', FX2, CH*0.855);
    ctx.beginPath(); ctx.moveTo(FX2, CH*0.895); ctx.lineTo(FX2+FW2, CH*0.895);
    ctx.strokeStyle = T.coverMid; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
    if (opts.name) {
      ctx.font = F(22, true, true); ctx.fillStyle = C.textDark;
      ctx.fillText(opts.name, FX2+6, CH*0.890);
    }
    drawSeasonPictos(ctx, RX + RW/2, CH * 0.945, T.coverDeep, 18);
  }

  // ── 하단 단청 띠 ─────────────────────────────────────────────────────────
  const botBandH = isL ? CH * 0.04 : CH * 0.028;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.10;
  ctx.fillRect(0, CH - botBandH, W, botBandH); ctx.globalAlpha = 1;

  drawNavBar(ctx, W, H, 'cover', opts.pages);
}

// ── fortune: 기본 운세 플래너 (무료 공통 / 사주 기본) ──────────────────────
function drawCoverFortune(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  const topBandH = CH * 0.04;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 0, W, topBandH); ctx.globalAlpha = 1;
  drawBrushStrokes(ctx, W, CH, T.coverMid);

  // 세로 중심선
  ctx.beginPath(); ctx.moveTo(W / 2, CH * 0.12); ctx.lineTo(W / 2, CH * 0.82);
  ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

  // 브랜드
  ctx.font = F(22, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.8;
  centeredText(ctx, 'fortunetab', CH * 0.285, W); ctx.globalAlpha = 1;
  drawHLine(ctx, W * 0.25, W * 0.75, CH * 0.310, T.coverDeep, 0.15);

  // 연도
  const ctxAny = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0.05em';
  ctx.font = F(W * 0.155, true, true); ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.85;
  centeredText(ctx, String(opts.year), CH * 0.52, W); ctx.globalAlpha = 1;
  if (ctxAny.letterSpacing !== undefined) ctxAny.letterSpacing = '0em';

  // 부제
  ctx.font = F(32, true, true); ctx.fillStyle = C.textDark;
  centeredText(ctx, '나만의 365일 플래너', CH * 0.588, W);
  ctx.font = F(20, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, `사주로 읽는 ${opts.year}년 운세 일력`, CH * 0.634, W);
  drawHLine(ctx, W * 0.25, W * 0.75, CH * 0.658, T.coverDeep, 0.15);

  // 철학 인용구
  ctx.font = F(14, false, true); ctx.fillStyle = T.coverMid; ctx.globalAlpha = 0.65;
  centeredText(ctx, PHILOSOPHIES[1].quote, CH * 0.698, W); ctx.globalAlpha = 1;

  // 이름 라인 + 사주 박스
  drawNameLine(ctx, W, CH, opts, T);
  if (opts.saju) drawSajuBox(ctx, W, CH, opts.saju, T);
  drawSeasonPictos(ctx, W / 2, opts.saju ? CH * 0.916 : CH * 0.878, T.coverDeep, 22);
}

// ── practice: 실천 플래너 (목표달성) ─────────────────────────────────────
function drawCoverPractice(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  const topBandH = CH * 0.04;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 0, W, topBandH); ctx.globalAlpha = 1;

  // 체크 패턴 배경 (브러시 대신)
  ctx.globalAlpha = 0.04;
  ctx.font = F(60, false, false); ctx.fillStyle = T.coverDeep;
  const checks = ['✓', '○', '✓', '○', '✓', '○'];
  checks.forEach((ch, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    ctx.fillText(ch, W * 0.15 + col * W * 0.3, CH * 0.15 + row * CH * 0.65);
  });
  ctx.globalAlpha = 1;

  // 세로 중심선
  ctx.beginPath(); ctx.moveTo(W / 2, CH * 0.12); ctx.lineTo(W / 2, CH * 0.82);
  ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.08; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;

  // 브랜드
  ctx.font = F(22, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.8;
  centeredText(ctx, 'fortunetab', CH * 0.285, W); ctx.globalAlpha = 1;
  drawHLine(ctx, W * 0.25, W * 0.75, CH * 0.310, T.coverDeep, 0.15);

  // 연도
  ctx.font = F(W * 0.155, true, true); ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.85;
  centeredText(ctx, String(opts.year), CH * 0.50, W); ctx.globalAlpha = 1;

  // 제목
  ctx.font = F(36, true, true); ctx.fillStyle = C.textDark;
  centeredText(ctx, '실천 플래너', CH * 0.575, W);
  ctx.font = F(20, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, '목표 달성 · 습관 형성 · 실천력 강화', CH * 0.624, W);
  drawHLine(ctx, W * 0.25, W * 0.75, CH * 0.650, T.coverDeep, 0.15);

  // 3개 핵심 키워드 가로 배치
  const keywords = ['🎯 목표', '✅ 실천', '🔁 습관'];
  ctx.font = F(18, false, false); ctx.fillStyle = T.coverMid; ctx.globalAlpha = 0.7;
  const kwY = CH * 0.700;
  const kwGap = W / (keywords.length + 1);
  keywords.forEach((kw, i) => {
    const x = kwGap * (i + 1) - ctx.measureText(kw).width / 2;
    ctx.fillText(kw, x, kwY);
  });
  ctx.globalAlpha = 1;

  // 철학 인용구
  ctx.font = F(14, false, true); ctx.fillStyle = T.coverMid; ctx.globalAlpha = 0.65;
  centeredText(ctx, PHILOSOPHIES[3].quote, CH * 0.750, W); ctx.globalAlpha = 1;

  drawNameLine(ctx, W, CH, opts, T);
  drawSeasonPictos(ctx, W / 2, CH * 0.878, T.coverDeep, 22);
}

// ── premium: 사주 프리미엄 (골드 프레임) ───────────────────────────────────
function drawCoverPremium(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  // 어두운 배경
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.95;
  ctx.fillRect(0, 0, W, CH); ctx.globalAlpha = 1;

  // 외곽 골드 프레임 (이중 테두리)
  const margin = W * 0.06;
  ctx.strokeStyle = C.goldFaint; ctx.globalAlpha = 0.4; ctx.lineWidth = 2;
  roundRect(ctx, margin, margin, W - margin * 2, CH - margin * 2, 4); ctx.stroke();
  ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
  roundRect(ctx, margin + 10, margin + 10, W - margin * 2 - 20, CH - margin * 2 - 20, 3); ctx.stroke();
  ctx.globalAlpha = 1;

  // 코너 장식 (4귀퉁이)
  const cLen = 40;
  ctx.strokeStyle = C.goldFaint; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
  [[margin+4, margin+4, 1, 1], [W-margin-4, margin+4, -1, 1],
   [margin+4, CH-margin-4, 1, -1], [W-margin-4, CH-margin-4, -1, -1]].forEach(([cx, cy, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + cLen * dx, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + cLen * dy); ctx.stroke();
  });
  ctx.globalAlpha = 1;

  // 브랜드
  ctx.font = F(20, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.6;
  centeredText(ctx, 'FORTUNETAB', CH * 0.22, W); ctx.globalAlpha = 1;

  // 장식 구분선
  ctx.strokeStyle = C.goldFaint; ctx.globalAlpha = 0.3; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(W * 0.3, CH * 0.25); ctx.lineTo(W * 0.7, CH * 0.25); ctx.stroke();
  ctx.globalAlpha = 1;

  // 타이틀
  ctx.font = F(42, true, true); ctx.fillStyle = C.goldFaint;
  centeredText(ctx, '사주 플래너', CH * 0.40, W);

  // 연도
  ctx.font = F(W * 0.18, true, true); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.15;
  centeredText(ctx, String(opts.year), CH * 0.58, W); ctx.globalAlpha = 1;

  // PREMIUM 배지
  ctx.font = F(24, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.8;
  centeredText(ctx, 'P R E M I U M', CH * 0.64, W); ctx.globalAlpha = 1;

  // 설명
  ctx.font = F(16, false, false); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5;
  centeredText(ctx, '플래너 + 20페이지 심층 사주 리포트', CH * 0.70, W); ctx.globalAlpha = 1;

  // 하단 장식선
  ctx.strokeStyle = C.goldFaint; ctx.globalAlpha = 0.3; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(W * 0.3, CH * 0.74); ctx.lineTo(W * 0.7, CH * 0.74); ctx.stroke();
  ctx.globalAlpha = 1;

  // 이름 라인 (밝은 색상)
  if (opts.name) {
    ctx.font = F(22, true, true); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.7;
    centeredText(ctx, opts.name, CH * 0.80, W); ctx.globalAlpha = 1;
  }

  // 사주 박스
  if (opts.saju) {
    const s = opts.saju;
    const SX = (W - 480) / 2, SY = CH * 0.82;
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.05;
    roundRect(ctx, SX, SY, 480, 70, 6); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = C.goldFaint; ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
    roundRect(ctx, SX, SY, 480, 70, 6); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.font = F(15, true, true); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.8;
    centeredText(ctx, `${s.yearPillar}년  ${s.monthPillar}월  ${s.dayPillar}일  ${s.hourPillar}시`, SY + 35, W);
    ctx.globalAlpha = 1;
    ctx.font = F(11, false, false); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.4;
    centeredText(ctx, `일간 ${s.dayElem} · 용신 ${s.yongsin} · ${s.elemSummary}`, SY + 58, W);
    ctx.globalAlpha = 1;
  }

  // 계절 픽토 (밝은 색)
  drawSeasonPictos(ctx, W / 2, CH * 0.93, C.goldFaint, 20);
}

// ── extras: 부록 플래너 맛보기 (모듈 그리드) ───────────────────────────────
function drawCoverExtras(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  // 상단 띠
  const topBandH = CH * 0.04;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.12;
  ctx.fillRect(0, 0, W, topBandH); ctx.globalAlpha = 1;

  // 브랜드
  ctx.font = F(18, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.7;
  centeredText(ctx, 'fortunetab', CH * 0.12, W); ctx.globalAlpha = 1;

  // 연도 (작게)
  ctx.font = F(48, true, true); ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.6;
  centeredText(ctx, String(opts.year), CH * 0.22, W); ctx.globalAlpha = 1;

  // 타이틀
  ctx.font = F(40, true, true); ctx.fillStyle = C.textDark;
  centeredText(ctx, '부록 플래너', CH * 0.32, W);
  ctx.font = F(18, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, '필요한 페이지만 골라서 나만의 조합', CH * 0.37, W);
  drawHLine(ctx, W * 0.2, W * 0.8, CH * 0.40, T.coverDeep, 0.12);

  // 2×3 아이콘 그리드 (부록 카테고리 미니 카드)
  const icons = [
    { emoji: '📋', label: '할일 목록' },
    { emoji: '🙏', label: '감사 저널' },
    { emoji: '✅', label: '습관 트래커' },
    { emoji: '💰', label: '재무 관리' },
    { emoji: '🎯', label: '목표 설정' },
    { emoji: '📝', label: '줄 노트' },
  ];
  const gridX = W * 0.15, gridW = W * 0.7;
  const cols = 3, rows = 2;
  const cellW = gridW / cols, cellH = CH * 0.10;
  const gridStartY = CH * 0.44;

  icons.forEach((ic, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const cx = gridX + col * cellW + cellW / 2;
    const cy = gridStartY + row * (cellH + CH * 0.02) + cellH / 2;

    // 미니 카드 배경
    ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.05;
    roundRect(ctx, cx - cellW * 0.42, cy - cellH * 0.42, cellW * 0.84, cellH * 0.84, 8);
    ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
    roundRect(ctx, cx - cellW * 0.42, cy - cellH * 0.42, cellW * 0.84, cellH * 0.84, 8);
    ctx.stroke(); ctx.globalAlpha = 1;

    // 아이콘
    ctx.font = F(28, false, false);
    ctx.fillText(ic.emoji, cx - 14, cy - 8);
    // 라벨
    ctx.font = F(13, false, false); ctx.fillStyle = C.textDark;
    const lw = ctx.measureText(ic.label).width;
    ctx.fillText(ic.label, cx - lw / 2, cy + 24);
  });

  // 배지
  const badgeY = CH * 0.72;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.08;
  roundRect(ctx, W * 0.25, badgeY, W * 0.5, CH * 0.05, 20); ctx.fill(); ctx.globalAlpha = 1;
  ctx.font = F(16, true, false); ctx.fillStyle = T.coverMid;
  centeredText(ctx, '7종 무료 선택', badgeY + CH * 0.033, W);

  // 하단 안내
  ctx.font = F(14, false, false); ctx.fillStyle = C.textLight; ctx.globalAlpha = 0.6;
  centeredText(ctx, '올인원 업그레이드 시 28종 전체 이용', CH * 0.82, W);
  ctx.globalAlpha = 1;

  drawSeasonPictos(ctx, W / 2, CH * 0.90, T.coverDeep, 20);
}

// ── allinone: 라이프 플래너 올인원 ──────────────────────────────────────────
function drawCoverAllInOne(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  // 어두운 워밍업 배경
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.08;
  ctx.fillRect(0, 0, W, CH); ctx.globalAlpha = 1;

  // 상단 띠 (넓게)
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.15;
  ctx.fillRect(0, 0, W, CH * 0.06); ctx.globalAlpha = 1;

  drawBrushStrokes(ctx, W, CH, T.coverMid);

  // 브랜드
  ctx.font = F(20, false, false); ctx.fillStyle = C.goldFaint; ctx.globalAlpha = 0.7;
  centeredText(ctx, 'fortunetab', CH * 0.15, W); ctx.globalAlpha = 1;
  drawHLine(ctx, W * 0.3, W * 0.7, CH * 0.175, T.coverDeep, 0.15);

  // 연도
  ctx.font = F(W * 0.13, true, true); ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.25;
  centeredText(ctx, String(opts.year), CH * 0.30, W); ctx.globalAlpha = 1;

  // 메인 타이틀
  ctx.font = F(44, true, true); ctx.fillStyle = C.textDark;
  centeredText(ctx, '라이프 플래너', CH * 0.40, W);

  // ALL-IN-ONE 배지
  ctx.font = F(22, false, false); ctx.fillStyle = T.coverMid; ctx.globalAlpha = 0.8;
  centeredText(ctx, 'A L L - I N - O N E', CH * 0.46, W); ctx.globalAlpha = 1;
  drawHLine(ctx, W * 0.2, W * 0.8, CH * 0.49, T.coverDeep, 0.12);

  // 아이콘 행 (인생 전 영역)
  const lifeIcons = ['📋', '✅', '💰', '🥗', '✈️', '📖', '🎯'];
  const iconY = CH * 0.55;
  const iconGap = W / (lifeIcons.length + 1);
  ctx.font = F(30, false, false);
  lifeIcons.forEach((icon, i) => {
    ctx.fillText(icon, iconGap * (i + 1) - 15, iconY);
  });

  // 설명 라인들
  ctx.font = F(16, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, '28종 부록 페이지 · 12개월 반복 · 7가지 테마', CH * 0.62, W);

  // 카테고리 태그들
  const tags = ['연간목표', '감사저널', '재무관리', '식단계획', '습관트래커', '비전보드'];
  const tagY = CH * 0.69;
  const tagH = 28;
  ctx.font = F(13, false, false);

  let totalTagW = 0;
  const tagWidths = tags.map(t => ctx.measureText(t).width + 24);
  tagWidths.forEach(tw => totalTagW += tw + 8);
  let tagX = (W - totalTagW) / 2;

  tags.forEach((tag, i) => {
    const tw = tagWidths[i];
    ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.06;
    roundRect(ctx, tagX, tagY, tw, tagH, 14); ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.15; ctx.lineWidth = 1;
    roundRect(ctx, tagX, tagY, tw, tagH, 14); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = T.coverMid; ctx.globalAlpha = 0.8;
    ctx.fillText(tag, tagX + 12, tagY + 19); ctx.globalAlpha = 1;
    tagX += tw + 8;
  });

  drawHLine(ctx, W * 0.25, W * 0.75, CH * 0.77, T.coverDeep, 0.12);

  // 이름 라인
  drawNameLine(ctx, W, CH, opts, T);
  drawSeasonPictos(ctx, W / 2, CH * 0.90, T.coverDeep, 20);
}

// ── 공통 헬퍼 ─────────────────────────────────────────────────────────────
function drawHLine(
  ctx: CanvasRenderingContext2D,
  x1: number, x2: number, y: number,
  color: string, alpha: number,
) {
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
  ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 0.8;
  ctx.stroke(); ctx.globalAlpha = 1;
}

function drawNameLine(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  opts: PlannerOptions, T: ColorTheme,
) {
  const FX = (W - 480) / 2;
  const LINE_Y = CH * 0.81;
  ctx.font = F(18, false, false); ctx.fillStyle = C.goldFaint;
  ctx.fillText('이름', FX, LINE_Y - 28);
  ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX + 480, LINE_Y);
  ctx.strokeStyle = T.coverMid; ctx.globalAlpha = 0.3; ctx.lineWidth = 1; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.beginPath(); ctx.moveTo(FX, LINE_Y); ctx.lineTo(FX, LINE_Y - 6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(FX + 480, LINE_Y); ctx.lineTo(FX + 480, LINE_Y - 6); ctx.stroke();
  if (opts.name) {
    ctx.font = F(26, true, true); ctx.fillStyle = C.textDark;
    ctx.fillText(opts.name, FX + 8, LINE_Y - 6);
  }
}

function drawSajuBox(
  ctx: CanvasRenderingContext2D, W: number, CH: number,
  s: NonNullable<PlannerOptions['saju']>, T: ColorTheme,
) {
  const SX = (W - 480) / 2, SY = CH * 0.840;
  ctx.fillStyle = T.coverDeep; ctx.globalAlpha = 0.06;
  roundRect(ctx, SX, SY, 480, 80, 8); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = T.coverDeep; ctx.globalAlpha = 0.2; ctx.lineWidth = 1;
  roundRect(ctx, SX, SY, 480, 80, 8); ctx.stroke(); ctx.globalAlpha = 1;
  ctx.font = F(13, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, '사주팔자', SY + 16, W);
  ctx.font = F(17, true, true); ctx.fillStyle = C.textDark;
  centeredText(ctx, `${s.yearPillar}년  ${s.monthPillar}월  ${s.dayPillar}일  ${s.hourPillar}시`, SY + 42, W);
  ctx.font = F(12, false, false); ctx.fillStyle = C.textLight;
  centeredText(ctx, `일간 ${s.dayElem} · 용신 ${s.yongsin} · ${s.elemSummary}`, SY + 64, W);
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
    const contentY = BAR_H + (isL ? 14 : 10);
    const contentH = CH - contentY - OUTER;
    const LINE_GAP = 22; // 점선 ruling 간격

    // ── 연간 목표 섹션 (컴팩트: 상단 22%) ──
    const goalH = contentH * 0.22;
    const goalBoxY = contentY;

    // 목표 배경 카드
    ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 1;
    roundRect(ctx, OUTER, goalBoxY, W - OUTER * 2, goalH, 8); ctx.fill(); ctx.stroke();

    // 목표 헤더 바
    const gHdrH = 28;
    const ghg = ctx.createLinearGradient(OUTER, goalBoxY, W - OUTER, goalBoxY);
    ghg.addColorStop(0, T.headerA); ghg.addColorStop(1, T.headerB);
    ctx.fillStyle = ghg;
    roundRect(ctx, OUTER, goalBoxY, W - OUTER * 2, gHdrH + 4, 8); ctx.fill();
    ctx.fillRect(OUTER, goalBoxY + gHdrH / 2, W - OUTER * 2, gHdrH / 2 + 4);
    ctx.font = F(13, true, false); ctx.fillStyle = C.goldFaint;
    ctx.fillText(`${opts.year}년 나의 3가지 목표`, OUTER + 10, goalBoxY + gHdrH * 0.72);

    // 3줄 목표 (가로 3분할)
    const goalColW = (W - OUTER * 2 - 20) / 3;
    const goalContentY = goalBoxY + gHdrH + 8;
    const goalContentH = goalH - gHdrH - 14;
    for (let i = 0; i < 3; i++) {
      const gx = OUTER + 8 + i * (goalColW + 2);
      // 번호 라벨
      ctx.font = F(12, true, true); ctx.fillStyle = T.headerA;
      ctx.globalAlpha = 0.90;
      ctx.fillText(`${i + 1}.`, gx, goalContentY + 14);
      ctx.globalAlpha = 1;
      // 점선 필기 라인
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.ruleFaint; ctx.lineWidth = 0.4;
      for (let ly = goalContentY + 22; ly < goalContentY + goalContentH; ly += LINE_GAP) {
        ctx.beginPath(); ctx.moveTo(gx + 16, ly); ctx.lineTo(gx + goalColW - 4, ly); ctx.stroke();
      }
      ctx.setLineDash([]);
      // 구분선 (마지막 제외)
      if (i < 2) {
        ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(gx + goalColW + 1, goalContentY); ctx.lineTo(gx + goalColW + 1, goalContentY + goalContentH); ctx.stroke();
      }
    }

    // ── 분기별 계획 그리드 (하단 75%) ──
    const QGAP = isL ? 12 : 8;
    const QY   = goalBoxY + goalH + (isL ? 12 : 8);
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
      const qHdrH = 36;
      const qhg = ctx.createLinearGradient(qx, qy, qx + QW, qy);
      qhg.addColorStop(0, T.headerA); qhg.addColorStop(1, T.headerB);
      ctx.fillStyle = qhg;
      roundRect(ctx, qx, qy, QW, qHdrH + 4, 8); ctx.fill();
      ctx.fillRect(qx, qy + qHdrH / 2, QW, qHdrH / 2 + 4);

      // Q 라벨 + 월 범위 (헤더 내 1행)
      ctx.font = F(15, true, true); ctx.fillStyle = C.goldFaint;
      ctx.fillText(`Q${q + 1}`, qx + 8, qy + qHdrH * 0.70);
      ctx.font = F(10, false, false); ctx.fillStyle = 'rgba(255,230,240,0.80)';
      const qmStr = Q_MONTHS[q];
      ctx.fillText(qmStr, qx + QW - ctx.measureText(qmStr).width - 8, qy + qHdrH * 0.68);

      // 2개 섹션: 목표 (상단 40%) + 계획 (하단 55%)
      const secY = qy + qHdrH + 6;
      const secH = QH - qHdrH - 10;
      const goalSecH = secH * 0.38;
      const planSecH = secH * 0.57;
      const planSecY = secY + goalSecH + secH * 0.05;

      // 목표 섹션
      ctx.font = F(10, true, false); ctx.fillStyle = T.headerA; ctx.globalAlpha = 0.85;
      ctx.fillText('목표', qx + 7, secY + 12);
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.ruleFaint; ctx.lineWidth = 0.4;
      for (let ly = secY + 20; ly < secY + goalSecH; ly += LINE_GAP) {
        ctx.beginPath(); ctx.moveTo(qx + 7, ly); ctx.lineTo(qx + QW - 7, ly); ctx.stroke();
      }
      ctx.setLineDash([]);

      // 구분선
      ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(qx + 7, planSecY - 4); ctx.lineTo(qx + QW - 7, planSecY - 4); ctx.stroke();

      // 계획 섹션
      ctx.font = F(10, true, false); ctx.fillStyle = T.headerA; ctx.globalAlpha = 0.85;
      ctx.fillText('실행 계획', qx + 7, planSecY + 12);
      ctx.globalAlpha = 1;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = C.ruleFaint; ctx.lineWidth = 0.4;
      for (let ly = planSecY + 20; ly < planSecY + planSecH; ly += LINE_GAP) {
        ctx.beginPath(); ctx.moveTo(qx + 7, ly); ctx.lineTo(qx + QW - 7, ly); ctx.stroke();
      }
      ctx.setLineDash([]);
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

    // 운세 등급 표시 (fortuneData 있을 때)
    const yiMonthFortune = opts.fortuneData?.monthlyFortunes.find((f) => f.month === m + 1);
    if (yiMonthFortune) {
      ctx.font = F(FM * 0.52, false, false); ctx.fillStyle = C.goldFaint;
      ctx.globalAlpha = 0.85;
      const gradeLabel = yiMonthFortune.yearIndexLabel;
      const glW = ctx.measureText(gradeLabel).width;
      ctx.fillText(gradeLabel, cx2 + CW_ - glW - 6, cy2 + FM * 1.15);
      ctx.globalAlpha = 1;
    }

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

  const ms = getModeStyle(opts.mode);
  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (테마 컬러)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.058);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.headerA); hg.addColorStop(1, T.headerB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.55, true, ms.headerSerif); ctx.fillStyle = C.goldFaint;
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

  // 철학/운세 배너 (헤더 바로 아래, 달력 위)
  const PAD    = PAGE_PAD;
  const GX     = PAD;
  const BANNER_H = 24;
  const BANNER_Y = BAR_H + 3;
  const monthFortune = opts.fortuneData?.monthlyFortunes.find((f) => f.month === monthIdx + 1);
  const bannerText = monthFortune
    ? monthFortune.bannerText
    : `${ms.accentSymbol}  ${getMonthPhilosophy(monthIdx).shortQuote}`;
  ctx.fillStyle = T.headerA;
  ctx.globalAlpha = ms.bannerOpacity;
  ctx.fillRect(PAD, BANNER_Y, W - PAD*2, BANNER_H);
  ctx.globalAlpha = 1;
  ctx.font = F(11, false, ms.headerSerif);
  ctx.fillStyle = T.headerA;
  ctx.globalAlpha = 0.70;
  ctx.fillText(bannerText, PAD + 10, BANNER_Y + BANNER_H * 0.73);
  ctx.globalAlpha = 1;

  const GY     = BANNER_Y + BANNER_H + (isL ? 5 : 4);
  const CAL_RATIO = 1.0; // 모든 모드에서 달력 전폭
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

  // 날짜 셀 — 하단 공간 확보 (운세 스트립 or 실천 OKR 패널)
  const CELL_Y = GY + DAY_H + 2;
  const FORTUNE_RESERVE = (opts.mode === 'fortune' && opts.fortuneData) ? 50 : 0;
  const PRACTICE_RESERVE = (opts.mode === 'practice' && !isL) ? 140 : 0;
  const BOTTOM_RESERVE = Math.max(FORTUNE_RESERVE, PRACTICE_RESERVE);
  const CELL_H = (CH - CELL_Y - PAD - BOTTOM_RESERVE) / 6;
  const first  = firstDayOf(opts.year, monthIdx);
  const days   = daysInMonth(opts.year, monthIdx);
  const NF     = Math.min(CELL_H*0.24, CELL_W*0.20, 20);
  const HF     = NF * 0.58; // 공휴일 이름 폰트
  const today  = new Date();

  for (let row = 0; row < 6; row++) {
    // 이 행에서 현재 월에 속하는 아무 날짜로 ISO 주차 판단
    let refDay = row*7 + 3 - first + 1; // 수요일 기준 시도
    if (refDay < 1) refDay = 1;          // 행 앞쪽이 전달이면 1일 사용
    if (refDay > days) continue;         // 행 전체가 다음달이면 건너뜀
    const refDate = new Date(opts.year, monthIdx, refDay);
    const isoWeek = getISOWeek(refDate);
    navLinks.push({
      x: GX, y: CELL_Y + row*CELL_H,
      w: CAL_W, h: CELL_H,
      targetType: 'weekly', targetIdx: isoWeek,
    });

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

        // 셀 내부 점선 ruling (메모 가능한 구조)
        const rulingStart = cy2 + NF * 1.8;
        const rulingEnd   = cy2 + CELL_H - 4;
        const rulingGap   = Math.max(18, (rulingEnd - rulingStart) / 4);
        ctx.strokeStyle = C.ruleFaint; ctx.lineWidth = 0.3;
        ctx.setLineDash([3, 3]);
        for (let ry = rulingStart; ry < rulingEnd; ry += rulingGap) {
          ctx.beginPath(); ctx.moveTo(cx2 + 3, ry); ctx.lineTo(cx2 + CELL_W - 4, ry); ctx.stroke();
        }
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = cellBg;
        ctx.fillRect(cx2, cy2, CELL_W-1, CELL_H-1);
        ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.5;
        ctx.strokeRect(cx2, cy2, CELL_W-1, CELL_H-1);
      }
    }
  }

  // ── 실천 플래너 세로형: 달력 하단 좌우 2분할 OKR 패널 ────────────────────
  if (opts.mode === 'practice' && !isL) {
    const calBottom = CELL_Y + 6 * CELL_H;
    const panelY = calBottom + 4;
    const panelH = CH - panelY - PAD;
    const GAP_MID = 8;
    const halfW = (W - PAD * 2 - GAP_MID) / 2;
    const HDR_H = 22;
    const LABEL_F = 10;
    const LINE_GAP = 18;

    // ── 공통 패널 렌더 함수 ──
    const drawPanel = (px: number, title: string, labels: string[]) => {
      // 카드 배경
      ctx.fillStyle = C.bgCard; ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.8;
      roundRect(ctx, px, panelY, halfW, panelH, 6); ctx.fill(); ctx.stroke();
      // 헤더 바
      const phg = ctx.createLinearGradient(px, panelY, px + halfW, panelY);
      phg.addColorStop(0, T.headerA); phg.addColorStop(1, T.headerB);
      ctx.fillStyle = phg;
      roundRect(ctx, px, panelY, halfW, HDR_H + 3, 6); ctx.fill();
      ctx.fillRect(px, panelY + HDR_H / 2, halfW, HDR_H / 2 + 3);
      ctx.font = F(11, true, false); ctx.fillStyle = C.goldFaint;
      ctx.fillText(title, px + 8, panelY + HDR_H * 0.76);
      // 4 항목
      const contentY = panelY + HDR_H + 4;
      const contentH = panelH - HDR_H - 8;
      const itemH = contentH / 4;
      for (let i = 0; i < 4; i++) {
        const iy = contentY + i * itemH;
        ctx.font = F(LABEL_F, true, false); ctx.fillStyle = T.headerA;
        ctx.globalAlpha = 0.85;
        ctx.fillText(labels[i], px + 6, iy + LABEL_F + 1);
        ctx.globalAlpha = 1;
        // 점선 ruling
        ctx.setLineDash([3, 3]); ctx.strokeStyle = C.ruleFaint; ctx.lineWidth = 0.4;
        for (let ly = iy + LABEL_F + 8; ly < iy + itemH - 2; ly += LINE_GAP) {
          ctx.beginPath(); ctx.moveTo(px + 6, ly); ctx.lineTo(px + halfW - 6, ly); ctx.stroke();
        }
        ctx.setLineDash([]);
        // 구분선
        if (i < 3) {
          ctx.strokeStyle = C.ruleColor; ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(px + 6, iy + itemH); ctx.lineTo(px + halfW - 6, iy + itemH); ctx.stroke();
        }
      }
    };

    // 좌측: 이달의 목표
    drawPanel(PAD, '이달의 목표', ['목표', 'KR 1', 'KR 2', 'KR 3']);
    // 우측: 이달의 회고
    drawPanel(PAD + halfW + GAP_MID, '이달의 회고', ['잘한 점', '개선점', '배운 것', '다음 달']);
  }

  // ── 운세 플래너: 달력 하단 컴팩트 운세 스트립 ────────────────────────────
  if (opts.mode === 'fortune' && opts.fortuneData) {
    const mf = opts.fortuneData.monthlyFortunes.find(f => f.month === monthIdx + 1);
    // 달력 마지막 행 아래 남은 공간에 1줄 스트립
    const calBottom = CELL_Y + 6 * CELL_H;
    const stripY = calBottom + 3;
    const stripH = CH - stripY - PAD;
    if (stripH > 20 && mf) {
      // 배경 (약간 더 강조)
      ctx.fillStyle = T.headerA; ctx.globalAlpha = 0.08;
      roundRect(ctx, PAD, stripY, W - PAD * 2, stripH, 6); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = T.headerA + '40'; ctx.lineWidth = 0.8;
      roundRect(ctx, PAD, stripY, W - PAD * 2, stripH, 6); ctx.stroke();

      // 1행: 등급 + 키워드 (상단)
      const gradeFont = Math.min(stripH * 0.36, 16);
      const kwFont    = Math.min(stripH * 0.28, 13);
      ctx.font = F(gradeFont, true, true); ctx.fillStyle = T.headerA;
      ctx.fillText(`✦ ${mf.grade}`, PAD + 10, stripY + stripH * 0.40);
      const gradeW = ctx.measureText(`✦ ${mf.grade}`).width;

      ctx.strokeStyle = T.headerA + '50'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(PAD + gradeW + 14, stripY + 6); ctx.lineTo(PAD + gradeW + 14, stripY + stripH * 0.50); ctx.stroke();

      ctx.font = F(kwFont, false, true); ctx.fillStyle = C.textDark;
      ctx.fillText(mf.keywords.join('  ·  '), PAD + gradeW + 20, stripY + stripH * 0.38);

      // 2행: 다짐 (하단)
      const affText = opts.fortuneData.dailyAffirmation;
      ctx.font = F(Math.min(stripH * 0.24, 11), false, true); ctx.fillStyle = C.textMid;
      ctx.fillText(affText, PAD + 10, stripY + stripH * 0.78);
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

  const ws = getModeStyle(opts.mode);
  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더 (테마 secondary/weekly 컬러)
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.weeklyA); hg.addColorStop(1, T.weeklyB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  // 헤더: 주차 + 해당 월 표시
  const headerMonth = mon.getMonth() === sun.getMonth()
    ? `${mon.getMonth()+1}월`
    : `${mon.getMonth()+1}월–${sun.getMonth()+1}월`;
  ctx.font = F(BAR_H*0.52, true, ws.headerSerif); ctx.fillStyle = C.goldFaint;
  ctx.fillText(`${opts.year}년 ${headerMonth} ${weekNum}주차`, PAGE_PAD, BAR_H*0.70);
  ctx.font = F(BAR_H*0.27, false, false); ctx.fillStyle = T.weeklyAccent;
  const rangeStr = `${fmtMD(mon)} ~ ${fmtMD(sun)}`;
  ctx.fillText(rangeStr, W - PAGE_PAD - ctx.measureText(rangeStr).width, BAR_H*0.68);

  // 이번 주 목표 / 운세 (세로 전용)
  const PAD = PAGE_PAD;
  let CONTENT_Y = BAR_H + PAD;

  if (!isL) {
    // 운세 모드: 주간 운세 바 (월 기준 운세 표시)
    if (opts.mode === 'fortune' && opts.fortuneData) {
      const wkMonth = mon.getMonth();  // 주 시작일의 월
      const wkFortune = opts.fortuneData.monthlyFortunes.find(f => f.month === wkMonth + 1);
      const FORTUNE_H = CH * 0.058;
      ctx.fillStyle = T.wkDayBgMid; ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 1;
      ctx.fillRect(PAD, CONTENT_Y, W - PAD * 2, FORTUNE_H);
      ctx.strokeRect(PAD, CONTENT_Y, W - PAD * 2, FORTUNE_H);

      if (wkFortune) {
        ctx.font = F(FORTUNE_H * 0.32, true, true); ctx.fillStyle = T.weeklyA;
        ctx.fillText(`${ws.accentSymbol} ${wkFortune.grade}`, PAD + 10, CONTENT_Y + FORTUNE_H * 0.64);
        const gradeW = ctx.measureText(`${ws.accentSymbol} ${wkFortune.grade}`).width;
        // 구분선
        ctx.strokeStyle = T.weeklyB + '60'; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(PAD + gradeW + 14, CONTENT_Y + 4); ctx.lineTo(PAD + gradeW + 14, CONTENT_Y + FORTUNE_H - 4); ctx.stroke();
        // 키워드
        ctx.font = F(FORTUNE_H * 0.26, false, true); ctx.fillStyle = C.textMid;
        ctx.fillText(wkFortune.keywords.join(' · '), PAD + gradeW + 22, CONTENT_Y + FORTUNE_H * 0.62);
      }
      CONTENT_Y += FORTUNE_H + PAD;
    } else {
      // 실천 모드 또는 운세 데이터 없음: 주간 포커스
      const GOAL_H = CH * 0.058;
      ctx.fillStyle = T.wkDayBgMid; ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 1;
      ctx.fillRect(PAD, CONTENT_Y, W - PAD * 2, GOAL_H);
      ctx.strokeRect(PAD, CONTENT_Y, W - PAD * 2, GOAL_H);
      const weekGoalLabel = opts.mode === 'practice' ? `${ws.accentSymbol} 이번 주 포커스` : `${ws.accentSymbol} 이번 주 목표`;
      ctx.font = F(GOAL_H * 0.34, true, ws.headerSerif); ctx.fillStyle = T.weeklyA;
      ctx.fillText(weekGoalLabel, PAD + 10, CONTENT_Y + GOAL_H * 0.66);
      const goalLabelW = ctx.measureText(weekGoalLabel).width;
      ctx.strokeStyle = T.weeklyB + '80'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(PAD + goalLabelW + 20, CONTENT_Y); ctx.lineTo(PAD + goalLabelW + 20, CONTENT_Y + GOAL_H);
      ctx.stroke();
      CONTENT_Y += GOAL_H + PAD;
    }
  }

  // 요일 헤더 (월~일 순서, 3단 구조: 요일 | 날짜 | 공휴일)
  const COLS      = 7;
  const COL_W     = (W - PAD*2) / COLS;
  const CONTENT_H = CH - CONTENT_Y - PAD;
  // 요일 헤더 (컴팩트)
  const DAY_H     = isL ? CONTENT_H*0.13 : CONTENT_H*0.09;
  const FONT_DY   = DAY_H * 0.32; // 요일명
  const FONT_DT   = DAY_H * 0.26; // 날짜
  const FONT_HOL  = DAY_H * 0.18; // 공휴일명

  for (let d = 0; d < 7; d++) {
    const wdate  = weekDates[d];
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

    const cx = PAD + d*COL_W;
    ctx.fillStyle = bgColor;
    ctx.fillRect(cx, CONTENT_Y, COL_W-1, DAY_H);

    // 1행: 요일명 (상단 35%)
    const dayStr = isL ? DAYS_WEEK_FULL[d] : DAYS_WEEK_SHORT[d];
    ctx.font = F(FONT_DY, true, false); ctx.fillStyle = fgColor;
    const dyw = ctx.measureText(dayStr).width;
    ctx.fillText(dayStr, cx + (COL_W-dyw)/2, CONTENT_Y + DAY_H*0.30);

    // 2행: 날짜 (중앙 35%) — 1일만 월 표기
    const dateStr = wdate.getDate() === 1
      ? `${wdate.getMonth()+1}/${wdate.getDate()}`
      : `${wdate.getDate()}`;
    ctx.font = F(FONT_DT, false, false); ctx.fillStyle = dateFgColor;
    const dtw = ctx.measureText(dateStr).width;
    ctx.fillText(dateStr, cx + (COL_W-dtw)/2, CONTENT_Y + DAY_H*0.58);

    // 3행: 공휴일명 (하단 30%)
    if (hol) {
      ctx.font = F(FONT_HOL, false, false);
      ctx.fillStyle = isRed ? C.holidayText : C.memorialText;
      const hn = hol.name.length > 6 ? hol.name.slice(0, 5) + '…' : hol.name;
      const hw = ctx.measureText(hn).width;
      ctx.fillText(hn, cx + (COL_W-hw)/2, CONTENT_Y + DAY_H*0.82);
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
  const ds = getModeStyle(opts.mode);
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH    = H - NAV_H;
  const isL   = opts.orientation === 'landscape';

  ctx.fillStyle = C.bgPage; ctx.fillRect(0, 0, W, CH);

  // 헤더
  const BAR_H = Math.round(isL ? CH*0.085 : CH*0.055);
  const hg    = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, T.headerA); hg.addColorStop(1, T.headerB);
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, BAR_H);

  ctx.font = F(BAR_H*0.50, true, ds.headerSerif); ctx.fillStyle = C.goldFaint;
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

  // 오늘의 다짐 (운세 다짐 또는 철학 의도)
  const QUOTE_Y = DATE_Y + DATE_H + PAD;
  const QUOTE_H = isL ? CH*0.066 : CH*0.050;
  // 운세: 따뜻한 톤 배경 / 실천: 쿨 톤 배경
  ctx.fillStyle = opts.mode === 'practice' ? T.wkDayBgMid : T.dayBgSun;
  ctx.fillRect(PAD, QUOTE_Y, W-PAD*2, QUOTE_H);
  const dailyLabel = opts.mode === 'practice' ? `${ds.accentSymbol} 오늘의 핵심` : `${ds.accentSymbol} 오늘의 다짐`;
  ctx.font = F(QUOTE_H*0.32, true, ds.headerSerif); ctx.fillStyle = T.headerA;
  ctx.fillText(dailyLabel, PAD+12, QUOTE_Y+QUOTE_H*0.42);
  const dailyText = opts.fortuneData
    ? opts.fortuneData.dailyAffirmation
    : (opts.mode === 'practice' ? PHILOSOPHIES[3] : PHILOSOPHIES[((opts.year) % 4 + 4) % 4]).intent;
  ctx.font = F(QUOTE_H*0.26, false, ds.headerSerif); ctx.fillStyle = T.headerA;
  ctx.globalAlpha = 0.72;
  ctx.fillText(dailyText, PAD + 12, QUOTE_Y + QUOTE_H * 0.80);
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
