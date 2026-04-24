/**
 * FortuneTab 부록 플래너 페이지 — 7개 레이아웃 패턴으로 28종 구현
 *
 * 패턴:
 *   drawCatGrid     — 2×3 / 2×4 카테고리 그리드 (Inspiration, Shopping, Bucket, Vision)
 *   drawMonthGrid   — 3×4 월별 그리드 (Year Glance, Important Dates, Birthday)
 *   drawTablePage   — 테이블 (Savings, Budget, Expense, Habit, SelfCare)
 *   drawSectionsPage — 섹션 나열 (Journal, Gratitude, Review, Reflection, Goals)
 *   drawTwoCol      — 2열 복합 (Daily Alt, Weekly Alt, Meal Plan, Travel)
 *   drawSimplePage  — 단순 리스트 (Todo, Notes, One Line a Day, Yearly Goals)
 */

import {
  F, SERIF, SANS, PAGE_PAD, NAV_H_RATIO,
  PAD_V2, LH, SECTION_HEAD_H,
  PAPER_V2, INK_V2, INK_FAINT_V2, SEAL_V2,
  C as BaseC, themeHolder, roundRect,
  drawPaperV2, drawHeaderV2, drawFooterV2,
  type PlannerOptions,
} from './pdf-utils';

// ── v2 디자인으로 통일된 테마 색상 (부록 28p) ─────────────────────
// v2 "New Eastern Editorial" 디자인 언어 적용:
//   배경 PAPER_V2 · 텍스트 INK_V2 · 악센트 T.accent · 인주 SEAL_V2
// 기존 헤더 그라디언트 · sectionBg 블록 배경은 v2 미색 + 먹선 + 얇은 경계로 대체.
function TC() {
  const T = themeHolder.T;
  return {
    bgPage:     PAPER_V2,
    bgCard:     '#ffffff',
    textDark:   INK_V2,
    textMid:    '#3a362e',
    textLight:  INK_FAINT_V2,
    ruleColor:  '#d8d2c4',
    ruleFaint:  '#ebe5d3',
    // 테마 악센트 (v2에서는 accent 단일)
    accent:     T.accent,
    accentDeep: T.accentDeep,
    seal:       SEAL_V2,
    // 호환용 — 기존 레이아웃 함수가 참조. 모두 v2 톤으로 매핑.
    headerA:    T.accent,
    headerB:    T.accentDeep,
    headerFg:   '#faf6ee',
    sectionBg:  '#f3ede0',        // 매우 옅은 미색 (테이블 헤더/교대 행)
    accentText: INK_V2,
    headerBg:   '#f3ede0',
  };
}

// ── 28종 페이지 설정 ────────────────────────────────────────────
export type ExtraPageType =
  | 'year-glance' | 'important-dates' | 'birthday-cal'
  | 'yearly-goals' | 'yearly-review' | 'vision-board'
  | 'monthly-goals' | 'one-line-day'
  | 'weekly-alt' | 'weekly-reflection' | 'meal-plan' | 'habit-tracker' | 'selfcare'
  | 'daily-alt' | 'journal' | 'gratitude'
  | 'savings' | 'budget' | 'household' | 'expense'
  | 'inspiration' | 'bucket-list' | 'travel' | 'shopping' | 'contacts'
  | 'todo' | 'notes-lined' | 'notes-grid'
  // ─── "생각하는대로 살기" 철학 기반 능동 설계 페이지 (Tier 1 + Tier 2) ───
  | 'saju-year-design'       // Tier 1-① 연간 설계 (6축 · 사주 렌즈)
  | 'saju-month-strategy'    // Tier 1-② 월간 전략·진입·중간점검·회고
  | 'saju-decision-canvas'   // Tier 1-③ 중요 결정 캔버스
  | 'saju-problem-dig'       // Tier 2-① 문제 파고들기 (5Why + 용신 행동)
  | 'saju-weekly-rhythm'     // Tier 2-② 주간 리듬 (사주 기반)
  | 'saju-daeun-timeline'    // 시각화 — 10년 대운 타임라인 배너
  | 'saju-year-heatmap';     // 시각화 — 12개월 세운 히트맵

export interface ExtraPageConfig {
  type: ExtraPageType;
  title: string;
  titleKo: string;
  category: 'annual' | 'monthly' | 'weekly' | 'daily' | 'finance' | 'life' | 'notes';
  categoryKo: string;
  icon: string;
  free: boolean;
}

export const EXTRA_PAGES: ExtraPageConfig[] = [
  // 연간
  { type: 'year-glance', title: 'YEAR AT A GLANCE', titleKo: '연간 한눈에', category: 'annual', categoryKo: '연간', icon: '📅', free: true },
  { type: 'important-dates', title: 'IMPORTANT DATES', titleKo: '중요 날짜', category: 'annual', categoryKo: '연간', icon: '📌', free: false },
  { type: 'birthday-cal', title: 'BIRTHDAY CALENDAR', titleKo: '생일 달력', category: 'annual', categoryKo: '연간', icon: '🎂', free: false },
  { type: 'yearly-goals', title: 'YEARLY GOALS', titleKo: '연간 목표', category: 'annual', categoryKo: '연간', icon: '🎯', free: true },
  { type: 'yearly-review', title: 'YEARLY REVIEW', titleKo: '연간 회고', category: 'annual', categoryKo: '연간', icon: '📊', free: false },
  { type: 'vision-board', title: 'VISION BOARD', titleKo: '비전 보드', category: 'annual', categoryKo: '연간', icon: '🌟', free: false },
  // 월간
  { type: 'monthly-goals', title: 'MONTHLY GOALS', titleKo: '월간 목표', category: 'monthly', categoryKo: '월간', icon: '🗓️', free: false },
  { type: 'one-line-day', title: 'ONE LINE A DAY', titleKo: '하루 한 줄', category: 'monthly', categoryKo: '월간', icon: '✍️', free: false },
  // 주간
  { type: 'weekly-alt', title: 'WEEKLY PLANNER', titleKo: '주간 계획', category: 'weekly', categoryKo: '주간', icon: '📋', free: false },
  { type: 'weekly-reflection', title: 'WEEKLY REFLECTION', titleKo: '주간 회고', category: 'weekly', categoryKo: '주간', icon: '🔄', free: false },
  { type: 'meal-plan', title: 'WEEKLY MEAL PLAN', titleKo: '주간 식단', category: 'weekly', categoryKo: '주간', icon: '🍽️', free: false },
  { type: 'habit-tracker', title: 'HABIT TRACKER', titleKo: '습관 트래커', category: 'weekly', categoryKo: '주간', icon: '✅', free: true },
  { type: 'selfcare', title: 'SELF CARE CHECKLIST', titleKo: '셀프케어', category: 'weekly', categoryKo: '주간', icon: '💆', free: false },
  // 일간
  { type: 'daily-alt', title: 'DAILY PLANNER', titleKo: '일간 계획', category: 'daily', categoryKo: '일간', icon: '📝', free: true },
  { type: 'journal', title: 'DAILY JOURNAL', titleKo: '일간 저널', category: 'daily', categoryKo: '일간', icon: '📔', free: false },
  { type: 'gratitude', title: 'DAILY GRATITUDE JOURNAL', titleKo: '감사 저널', category: 'daily', categoryKo: '일간', icon: '🙏', free: true },
  // 재무
  { type: 'savings', title: 'SAVINGS TRACKER', titleKo: '저축 추적', category: 'finance', categoryKo: '재무', icon: '💰', free: false },
  { type: 'budget', title: 'BUDGET TRACKER', titleKo: '예산 추적', category: 'finance', categoryKo: '재무', icon: '📒', free: false },
  { type: 'household', title: 'MONTHLY HOUSEHOLD BUDGET', titleKo: '가계부', category: 'finance', categoryKo: '재무', icon: '🏠', free: false },
  { type: 'expense', title: 'EXPENSE TRACKER', titleKo: '지출 추적', category: 'finance', categoryKo: '재무', icon: '💳', free: false },
  // 라이프
  { type: 'inspiration', title: 'INSPIRATION', titleKo: '영감', category: 'life', categoryKo: '라이프', icon: '💡', free: false },
  { type: 'bucket-list', title: 'BUCKET LIST', titleKo: '버킷 리스트', category: 'life', categoryKo: '라이프', icon: '⭐', free: false },
  { type: 'travel', title: 'TRAVEL PLANNER', titleKo: '여행 계획', category: 'life', categoryKo: '라이프', icon: '✈️', free: false },
  { type: 'shopping', title: 'SHOPPING LIST', titleKo: '쇼핑 리스트', category: 'life', categoryKo: '라이프', icon: '🛒', free: false },
  { type: 'contacts', title: 'CONTACT LIST', titleKo: '연락처', category: 'life', categoryKo: '라이프', icon: '📇', free: false },
  // 노트
  { type: 'todo', title: 'TO-DO LIST', titleKo: '할일 목록', category: 'notes', categoryKo: '노트', icon: '☑️', free: true },
  { type: 'notes-lined', title: 'NOTES', titleKo: '줄 노트', category: 'notes', categoryKo: '노트', icon: '📄', free: true },
  { type: 'notes-grid', title: 'NOTES', titleKo: '모눈 노트', category: 'notes', categoryKo: '노트', icon: '📐', free: false },
  // "생각하는대로 살기" — 사주 기반 능동 설계 · 실질 사고 도구 (모두 프리미엄)
  { type: 'saju-year-design',     title: 'YEAR DESIGN',          titleKo: '연간 설계',       category: 'annual',  categoryKo: '연간', icon: '🧭', free: false },
  { type: 'saju-month-strategy',  title: 'MONTH STRATEGY',       titleKo: '월간 전략',       category: 'monthly', categoryKo: '월간', icon: '♟️', free: false },
  { type: 'saju-decision-canvas', title: 'DECISION CANVAS',      titleKo: '결정 캔버스',     category: 'life',    categoryKo: '라이프', icon: '⚖️', free: false },
  { type: 'saju-problem-dig',     title: 'PROBLEM DIG',          titleKo: '문제 파고들기',   category: 'life',    categoryKo: '라이프', icon: '🔎', free: false },
  { type: 'saju-weekly-rhythm',   title: 'WEEKLY RHYTHM',        titleKo: '주간 리듬',       category: 'weekly',  categoryKo: '주간', icon: '🌗', free: false },
  // 시각화 — 결제 직후 첫 펼침에서 "이건 내 사주 다이어리" 인상 확정
  { type: 'saju-daeun-timeline',  title: 'DAEUN TIMELINE',       titleKo: '10년 대운 타임라인', category: 'annual', categoryKo: '연간', icon: '🎯', free: false },
  { type: 'saju-year-heatmap',    title: 'YEAR HEATMAP',         titleKo: '12개월 세운 히트맵', category: 'annual', categoryKo: '연간', icon: '🌊', free: false },
];

// ── 공통 유틸 (v2 "New Eastern Editorial") ────────────────────────
function drawPageHeader(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, subtitle?: string,
  _useSerif = true,  // 시그니처 유지 — v2에서는 Playfair+Serif 고정
) {
  const T = themeHolder.T;
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH = H - NAV_H;
  const PAD = PAD_V2;

  // v2 미색 종이 + 그레인 + 상단 먹선 + FORTUNETAB 모노라인
  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // 타이틀 블록: 왼쪽 Playfair 대형 영문 타이틀 + 한글 부제
  ctx.font = '900 48px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  ctx.fillText(title, PAD, PAD + 66);

  if (subtitle) {
    ctx.font = '300 15px "Noto Serif KR", serif';
    ctx.fillStyle = INK_FAINT_V2;
    ctx.fillText(subtitle, PAD, PAD + 96);
  }

  // 타이틀 아래 얇은 먹선
  const dividerY = PAD + 118;
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(PAD, dividerY); ctx.lineTo(W - PAD, dividerY); ctx.stroke();
  ctx.globalAlpha = 1;

  return { CH, PAD, startY: dividerY + 20 };
}

/** v2 스타일 푸터 — 각 부록 페이지 렌더 마지막에 호출 */
function drawExtraFooter(ctx: CanvasRenderingContext2D, W: number, H: number, label: string) {
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH = H - NAV_H;
  drawFooterV2(ctx, W, CH, label);
}

function drawCheckbox(ctx: CanvasRenderingContext2D, x: number, y: number, size = 14) {
  const c = TC();
  ctx.strokeStyle = c.ruleColor;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, size, size, 2);
  ctx.stroke();
}

function drawCircleCheck(ctx: CanvasRenderingContext2D, x: number, y: number, r = 7) {
  const c = TC();
  ctx.strokeStyle = c.headerA;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSectionHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  const T = themeHolder.T;
  // v2: 배경 블록 제거 → 상·하 얇은 먹선 + 가운데 accent 라벨
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.25; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = '600 13px "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, x + (w - tw) / 2, y + h * 0.66);
}

// ═══════════════════════════════════════════════════════════════
// 패턴 1: 카테고리 그리드 (2×N)
// ═══════════════════════════════════════════════════════════════
function drawCatGrid(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, categories: string[], rows: number, checkLines: number,
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, `YEAR: ________`, useSerif);
  const c = TC();
  const GAP = 10;
  const cols = 2;
  const boxW = (W - PAD * 2 - GAP) / cols;
  const boxH = (CH - startY - PAD - (rows - 1) * GAP) / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const idx = r * cols + col;
      if (idx >= categories.length) break;
      const bx = PAD + col * (boxW + GAP);
      const by = startY + r * (boxH + GAP);

      ctx.strokeStyle = c.ruleColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, boxW, boxH);

      drawSectionHeader(ctx, bx, by, boxW, 28, categories[idx]);

      const lineH = (boxH - 28 - 10) / checkLines;
      for (let l = 0; l < checkLines; l++) {
        const ly = by + 28 + 8 + l * lineH;
        drawCheckbox(ctx, bx + 10, ly);
        ctx.strokeStyle = c.ruleFaint;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(bx + 30, ly + 14);
        ctx.lineTo(bx + boxW - 10, ly + 14);
        ctx.stroke();
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 패턴 2: 3×4 월별 그리드
// ═══════════════════════════════════════════════════════════════
const MONTHS_EN = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function drawMonthGrid(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, linesPerMonth: number, hasDateCol: boolean,
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, `YEAR: ________`, useSerif);
  const c = TC();
  const cols = 3;
  const rows = 4;
  const GAP = 8;
  const boxW = (W - PAD * 2 - (cols - 1) * GAP) / cols;
  const boxH = (CH - startY - PAD - (rows - 1) * GAP) / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const idx = r * cols + col;
      const bx = PAD + col * (boxW + GAP);
      const by = startY + r * (boxH + GAP);

      ctx.strokeStyle = c.ruleColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, boxW, boxH);

      // 월 이름 (헤더 또는 볼드)
      ctx.font = F(11, true, false);
      ctx.fillStyle = c.textDark;
      ctx.fillText(MONTHS_EN[idx], bx + 8, by + 18);

      // 줄
      const lineH = (boxH - 28) / linesPerMonth;
      for (let l = 0; l < linesPerMonth; l++) {
        const ly = by + 28 + l * lineH;
        if (hasDateCol) {
          // 짧은 날짜 칸 + 긴 이름 칸
          ctx.strokeStyle = c.ruleFaint;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(bx + 4, ly + lineH - 2);
          ctx.lineTo(bx + boxW - 4, ly + lineH - 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = c.ruleFaint;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(bx + 4, ly + lineH - 2);
          ctx.lineTo(bx + boxW - 4, ly + lineH - 2);
          ctx.stroke();
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 패턴 3: 테이블
// ═══════════════════════════════════════════════════════════════
function drawTablePage(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, subtitle: string,
  columns: { label: string; width: number }[],
  dataRows: number, hasTotal: boolean,
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, subtitle, useSerif);
  const c = TC();
  const tableW = W - PAD * 2;
  const headerH = 28;
  const rowH = (CH - startY - PAD - headerH - (hasTotal ? 30 : 0)) / dataRows;

  // 컬럼 헤더
  let cx = PAD;
  ctx.fillStyle = c.headerBg;
  ctx.fillRect(PAD, startY, tableW, headerH);
  for (const col of columns) {
    const colW = tableW * col.width;
    ctx.font = F(10, true, false);
    ctx.fillStyle = c.textDark;
    ctx.fillText(col.label, cx + 8, startY + 18);
    cx += colW;
  }

  // 데이터 행
  for (let r = 0; r < dataRows; r++) {
    const ry = startY + headerH + r * rowH;
    ctx.strokeStyle = c.ruleFaint;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(PAD, ry + rowH);
    ctx.lineTo(W - PAD, ry + rowH);
    ctx.stroke();

    // 컬럼 구분선
    let lx = PAD;
    for (let i = 0; i < columns.length - 1; i++) {
      lx += tableW * columns[i].width;
      ctx.beginPath();
      ctx.moveTo(lx, ry);
      ctx.lineTo(lx, ry + rowH);
      ctx.stroke();
    }
  }

  // 외곽선
  const tableH = headerH + dataRows * rowH;
  ctx.strokeStyle = c.ruleColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD, startY, tableW, tableH);

  // TOTAL 행
  if (hasTotal) {
    const ty = startY + tableH + 4;
    ctx.fillStyle = c.headerBg;
    ctx.fillRect(PAD, ty, tableW, 26);
    ctx.font = F(11, true, false);
    ctx.fillStyle = c.textDark;
    ctx.fillText('TOTAL:', PAD + 8, ty + 18);
    ctx.strokeStyle = c.ruleColor;
    ctx.strokeRect(PAD, ty, tableW, 26);
  }
}

// ═══════════════════════════════════════════════════════════════
// 패턴 4: 섹션 나열
// ═══════════════════════════════════════════════════════════════
function drawSectionsPage(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, dateLabel: string,
  sections: { label: string; style: 'check' | 'dotted' | 'free'; lines: number }[],
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel, useSerif);
  const c = TC();
  const GAP = 8;
  const totalLines = sections.reduce((s, sec) => s + sec.lines + 1.5, 0);
  const unitH = (CH - startY - PAD - (sections.length - 1) * GAP) / totalLines;

  let y = startY;
  for (const sec of sections) {
    const secH = unitH * (sec.lines + 1.5);

    ctx.strokeStyle = c.ruleColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, y, W - PAD * 2, secH);

    drawSectionHeader(ctx, PAD, y, W - PAD * 2, 28, sec.label);

    const lineH = (secH - 28 - 6) / sec.lines;
    for (let l = 0; l < sec.lines; l++) {
      const ly = y + 28 + 4 + l * lineH;
      if (sec.style === 'check') {
        drawCheckbox(ctx, PAD + 10, ly + lineH * 0.3);
        ctx.strokeStyle = c.ruleFaint;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 30, ly + lineH * 0.3 + 14);
        ctx.lineTo(W - PAD - 10, ly + lineH * 0.3 + 14);
        ctx.stroke();
      } else if (sec.style === 'dotted') {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = c.ruleFaint;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 10, ly + lineH - 2);
        ctx.lineTo(W - PAD - 10, ly + lineH - 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = c.ruleFaint;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 10, ly + lineH - 2);
        ctx.lineTo(W - PAD - 10, ly + lineH - 2);
        ctx.stroke();
      }
    }
    y += secH + GAP;
  }
}

// ═══════════════════════════════════════════════════════════════
// 패턴 5: 2열 복합
// ═══════════════════════════════════════════════════════════════
function drawTwoCol(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, dateLabel: string,
  leftSections: { label: string; lines: number }[],
  rightSections: { label: string; lines: number; style?: 'check' | 'line' }[],
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel, useSerif);
  const c = TC();
  const GAP = 12;
  const colW = (W - PAD * 2 - GAP) / 2;

  // 좌측
  let ly = startY;
  for (const sec of leftSections) {
    const secH = (CH - startY - PAD) / leftSections.length - 6;
    drawSectionHeader(ctx, PAD, ly, colW, 26, sec.label);
    ctx.strokeStyle = c.ruleColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, ly, colW, secH);

    const lineH = (secH - 26 - 4) / sec.lines;
    for (let l = 0; l < sec.lines; l++) {
      const y2 = ly + 26 + 2 + l * lineH;
      drawCircleCheck(ctx, PAD + 8, y2 + lineH * 0.2);
      ctx.strokeStyle = c.ruleFaint;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 28, y2 + lineH * 0.2 + 14);
      ctx.lineTo(PAD + colW - 8, y2 + lineH * 0.2 + 14);
      ctx.stroke();
    }
    ly += secH + 6;
  }

  // 우측
  let ry = startY;
  const rx = PAD + colW + GAP;
  for (const sec of rightSections) {
    const secH = (CH - startY - PAD) / rightSections.length - 6;
    drawSectionHeader(ctx, rx, ry, colW, 26, sec.label);
    ctx.strokeStyle = c.ruleColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(rx, ry, colW, secH);

    const lineH = (secH - 26 - 4) / sec.lines;
    for (let l = 0; l < sec.lines; l++) {
      const y2 = ry + 26 + 2 + l * lineH;
      if (sec.style === 'check') {
        drawCircleCheck(ctx, rx + 8, y2 + lineH * 0.2);
      }
      ctx.strokeStyle = c.ruleFaint;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(rx + (sec.style === 'check' ? 28 : 8), y2 + lineH - 2);
      ctx.lineTo(rx + colW - 8, y2 + lineH - 2);
      ctx.stroke();
    }
    ry += secH + 6;
  }
}

// ═══════════════════════════════════════════════════════════════
// 패턴 6: 단순 리스트
// ═══════════════════════════════════════════════════════════════
function drawSimplePage(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, dateLabel: string,
  style: 'check' | 'lined' | 'grid' | 'numbered' | 'goals',
  lines: number,
  useSerif = true,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel, useSerif);
  const c = TC();

  if (style === 'grid') {
    const cellSize = 24;
    const cols = Math.floor((W - PAD * 2) / cellSize);
    const rows = Math.floor((CH - startY - PAD) / cellSize);
    ctx.strokeStyle = c.ruleFaint;
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(PAD, startY + r * cellSize);
      ctx.lineTo(PAD + cols * cellSize, startY + r * cellSize);
      ctx.stroke();
    }
    for (let col = 0; col <= cols; col++) {
      ctx.beginPath();
      ctx.moveTo(PAD + col * cellSize, startY);
      ctx.lineTo(PAD + col * cellSize, startY + rows * cellSize);
      ctx.stroke();
    }
    return;
  }

  const lineH = (CH - startY - PAD) / lines;

  for (let l = 0; l < lines; l++) {
    const y = startY + l * lineH;

    if (style === 'check') {
      drawCircleCheck(ctx, PAD, y + lineH * 0.3);
      ctx.strokeStyle = c.ruleColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 20, y + lineH - 4);
      ctx.lineTo(W - PAD, y + lineH - 4);
      ctx.stroke();
    } else if (style === 'numbered') {
      // 교대 줄무늬
      if (l % 2 === 0) {
        ctx.fillStyle = c.headerBg;
        ctx.fillRect(PAD, y, W - PAD * 2, lineH);
      }
      ctx.font = F(12, false, false);
      ctx.fillStyle = c.textMid;
      ctx.fillText(String(l + 1), PAD + 6, y + lineH * 0.65);
      ctx.strokeStyle = c.ruleFaint;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD + 30, y + lineH - 2);
      ctx.lineTo(W - PAD, y + lineH - 2);
      ctx.stroke();
    } else if (style === 'goals') {
      // 2섹션: 목표 (상단 50%) + 실행 (하단 50%)
      const halfLines = Math.floor(lines / 2);
      if (l === 0) {
        drawSectionHeader(ctx, PAD, y, W - PAD * 2, 28, '올해의 목표');
      } else if (l === halfLines) {
        drawSectionHeader(ctx, PAD, y, W - PAD * 2, 28, '실행 계획');
      } else {
        drawCheckbox(ctx, PAD + 10, y + lineH * 0.3);
        ctx.strokeStyle = c.ruleFaint;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(PAD + 30, y + lineH - 4);
        ctx.lineTo(W - PAD - 10, y + lineH - 4);
        ctx.stroke();
      }
    } else {
      // lined
      ctx.strokeStyle = c.ruleColor;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(PAD, y + lineH - 4);
      ctx.lineTo(W - PAD, y + lineH - 4);
      ctx.stroke();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 사주 능동 설계 페이지 — 프롬프트 프레임
//
// 단순 빈 칸이 아니라 "사주로 나를 비추고 → 의도적으로 설계"하도록
// 각 질문에 일간·용신·현재 대운을 변수로 끼워 넣는다. 사주 데이터가
// 없으면(무료 플래너) 일반 질문으로 fallback.
// ═══════════════════════════════════════════════════════════════

interface SajuShortHand {
  day: string;        // "계(癸)수" — 일간+오행
  yongsin: string;    // "금"
  daeun: string;      // "43~52세 경오(庚午) 정인"
  daeunKey: string;   // "정인" — 사용 권고 축에 사용
  weak: boolean;      // true=신약
}

function sajuShort(s: PlannerOptions['saju']): SajuShortHand {
  if (!s) {
    return { day: '일간', yongsin: '용신', daeun: '현재 대운', daeunKey: '대운', weak: false };
  }
  const dm = s.dayMasterKo ?? s.dayElem;
  const day = dm.includes('(') ? dm + s.dayElem : `${dm} ${s.dayElem}`;
  return {
    day,
    yongsin: s.yongsin || '용신',
    daeun: s.currentDaeun ?? '현재 대운',
    daeunKey: s.daeunSipsin ?? '대운',
    weak: s.strength === '신약',
  };
}

function drawSajuYearDesign(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const s = sajuShort(opts.saju);
  // 6축 설계 — 업/건/재/연/학/정 · 각 축을 한 줄 질문 + 2줄 답변으로 구성
  // 맨 아래 북극성 한 문장.
  drawSectionsPage(ctx, W, H, 'YEAR DESIGN', `YEAR: ${opts.year}    일간 ${s.day} · ${s.daeun}`, [
    { label: `업(業) — 올해 ${s.day}(${s.daeunKey} 대운)을 쓸 한 가지 작업은 무엇인가?`, style: 'free', lines: 3 },
    { label: `건(健) — ${s.weak ? '신약 ' : ''}${s.day}를 ${s.yongsin}(으)로 채울 루틴 3개`, style: 'check', lines: 3 },
    { label: `재(財) — 성과를 수치·증거로 남길 방법 (소득/저축/관리 중 택)`, style: 'free', lines: 2 },
    { label: `연(緣) — 올해 깊게 만들 관계 3명 · 각자와의 다음 행동`, style: 'free', lines: 3 },
    { label: `학(學) — ${s.daeunKey} 대운에 어울리는 배움 주제 1개 + 6개월 마일스톤`, style: 'free', lines: 3 },
    { label: `정(整) — 비울 것 · 놓아줄 것 3가지`, style: 'check', lines: 3 },
    { label: `★ 올해의 북극성 — 한 문장으로`, style: 'free', lines: 2 },
  ], useSerif);
}

function drawSajuMonthStrategy(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const s = sajuShort(opts.saju);
  // 한 달 = 3단계 사이클 (진입 / 중간점검 / 월말 회고)
  drawSectionsPage(ctx, W, H, 'MONTH STRATEGY', `MONTH: ________    YEAR: ${opts.year}`, [
    { label: `▷ 월초 전략 — 이번 달 월주와 ${s.daeun}이 교차하는 지점에서 집중할 것`, style: 'free', lines: 3 },
    { label: `이번 달 핵심 행동 3가지 (한 문장씩, 실행 동사로 시작)`, style: 'check', lines: 3 },
    { label: `⊙ 15일 중간 점검 — 계획 대비 실행률 · 막힌 지점 · 조정안`, style: 'free', lines: 4 },
    { label: `◯ 월말 회고 — 이달의 배움 한 문장 + 다음 달로 넘길 씨앗`, style: 'free', lines: 4 },
    { label: `★ 이 달 하나만 기억한다면`, style: 'free', lines: 2 },
  ], useSerif);
}

function drawSajuDecisionCanvas(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const s = sajuShort(opts.saju);
  drawSectionsPage(ctx, W, H, 'DECISION CANVAS', `DATE: ________    ${s.day}의 결정`, [
    { label: `결정해야 할 것 — 한 문장으로`, style: 'free', lines: 2 },
    { label: `사주 렌즈 — ${s.yongsin} 용신 관점의 장점 / 기신(忌神) 관점의 리스크`, style: 'free', lines: 4 },
    { label: `상(上) 시나리오 — 가장 좋은 결과와 도달 조건 3`, style: 'free', lines: 3 },
    { label: `하(下) 시나리오 — 최악일 때의 모습과 복구 비용`, style: 'free', lines: 3 },
    { label: `조언자 3인 — 이름 · 그에게 물을 질문 한 가지씩`, style: 'free', lines: 3 },
    { label: `실행 첫 3일 — 오늘/내일/모레 행동 1줄씩 · 결정 마감일`, style: 'check', lines: 4 },
  ], useSerif);
}

function drawSajuProblemDig(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const s = sajuShort(opts.saju);
  drawSectionsPage(ctx, W, H, 'PROBLEM DIG', `DATE: ________    5 WHY · ${s.day} 렌즈`, [
    { label: `문제 — 지금 막혀 있는 한 가지를 한 문장으로`, style: 'free', lines: 2 },
    { label: `WHY 1 — 왜 이것이 문제인가?`, style: 'free', lines: 2 },
    { label: `WHY 2 — 그 이유의 이유는?`, style: 'free', lines: 2 },
    { label: `WHY 3 — 그 뒤에 있는 것은?`, style: 'free', lines: 2 },
    { label: `WHY 4 — 더 깊은 원인은?`, style: 'free', lines: 2 },
    { label: `WHY 5 — 근원은 무엇인가? (정지점)`, style: 'free', lines: 2 },
    { label: `★ ${s.yongsin} 용신 행동 — 근원을 풀 ${s.weak ? '한 박자 쉬어가는 ' : '결단적 '}선택 1개`, style: 'check', lines: 3 },
  ], useSerif);
}

function drawSajuWeeklyRhythm(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const s = sajuShort(opts.saju);
  // 요일별 에너지 테마 (사주 없을 때는 일반 7일)
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const themes = opts.saju
    ? [
        `월 — 진입 (${s.daeunKey} 대운 의식하기 · 이번 주 목표 한 문장)`,
        `화 — 실행 (${s.day} 체력 안배 · 핵심 1건 먼저)`,
        `수 — 전환점 (막힘 점검 · ${s.yongsin} 행동 주입)`,
        `목 — 깊이 (하나만 깊게 · 산만함 브레이크)`,
        `금 — 연결 (사람 1인에게 감사 · 도움 요청)`,
        `토 — 회복 (${s.weak ? '충분한 휴식 · ' : ''}몸을 ${s.yongsin}(으)로 채우기)`,
        `일 — 설계 (다음 주 1문장 · 버릴 것 3개)`,
      ]
    : days.map((d) => `${d}요일`);
  drawSectionsPage(ctx, W, H, 'WEEKLY RHYTHM', `WEEK OF: ________    ${s.day}`,
    themes.map((t) => ({ label: t, style: 'dotted' as const, lines: 3 })),
    useSerif);
}

// ═══════════════════════════════════════════════════════════════
// 사주 시각화 — 대운 타임라인 + 12개월 세운 히트맵
// ═══════════════════════════════════════════════════════════════

const OHAENG_COLOR: Record<string, string> = {
  목: '#4b8b3b', 화: '#c23b22', 토: '#b08b4f', 금: '#8a8d93', 수: '#2f5e8a',
};

function drawSajuDaeunTimeline(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H,
    'DAEUN TIMELINE', `10년 × 8기 대운 · YEAR ${opts.year}`, useSerif);
  const c = TC();

  // 데이터가 없으면 안내만 렌더링
  const s = opts.saju;
  const periods = s?.daeun?.periods;
  if (!s || !periods || periods.length === 0) {
    ctx.font = `300 14px ${useSerif ? '"Noto Serif KR", serif' : '"Noto Sans KR", sans-serif'}`;
    ctx.fillStyle = '#888';
    ctx.fillText('사주 데이터가 있어야 10년 대운 타임라인이 채워집니다 (프리미엄 주문 시 자동 연결).', PAD, startY + 40);
    return;
  }

  const age = s.ageThisYear ?? 0;
  const barY = startY + 60;
  const barH = 80;
  const totalW = W - PAD * 2;
  const segW = totalW / periods.length;

  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const x = PAD + segW * i;
    const elem = p.stemElem ?? '토';
    const color = OHAENG_COLOR[elem] || '#888';
    const isCurrent = age >= p.startAge && age <= p.endAge;

    ctx.fillStyle = color;
    ctx.globalAlpha = isCurrent ? 0.85 : 0.35;
    ctx.fillRect(x, barY, segW - 2, barH);
    ctx.globalAlpha = 1;

    // 천간지지
    ctx.font = `700 18px "Noto Serif KR", serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText(p.pillarKo ?? '', x + 8, barY + 28);
    // 십신
    ctx.font = `400 11px "Noto Sans KR", sans-serif`;
    ctx.fillText(p.sipsin ?? '', x + 8, barY + 46);
    // 나이 범위
    ctx.font = `300 11px "Noto Sans KR", sans-serif`;
    ctx.fillText(`${p.startAge}-${p.endAge}`, x + 8, barY + barH - 10);

    // 현재 핀
    if (isCurrent) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + segW / 2, barY - 10, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + segW / 2, barY - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c1121f';
      ctx.font = `700 11px "Noto Sans KR", sans-serif`;
      ctx.fillText('NOW', x + segW / 2 - 14, barY - 22);
    }
  }

  // 범례 — 오행 5색
  const legendY = barY + barH + 40;
  ctx.font = `300 12px "Noto Sans KR", sans-serif`;
  ctx.fillStyle = c.textMid;
  ctx.fillText('오행 색상', PAD, legendY);
  const elems: ('목'|'화'|'토'|'금'|'수')[] = ['목','화','토','금','수'];
  elems.forEach((e, i) => {
    const lx = PAD + 80 + i * 90;
    ctx.fillStyle = OHAENG_COLOR[e];
    ctx.fillRect(lx, legendY - 10, 14, 14);
    ctx.fillStyle = c.textDark;
    ctx.fillText(e, lx + 22, legendY + 2);
  });

  // 아래 해설
  const noteY = legendY + 50;
  ctx.font = `400 13px "Noto Serif KR", serif`;
  ctx.fillStyle = c.textDark;
  ctx.fillText('대운은 10년 단위로 인생의 큰 흐름을 결정합니다.', PAD, noteY);
  ctx.font = `300 12px "Noto Serif KR", serif`;
  ctx.fillStyle = c.textMid;
  ctx.fillText('NOW 핀의 색이 당신의 현재 에너지. 다음 대운으로 넘어갈 때 정체성과 과제가 재조정됩니다.', PAD, noteY + 22);
  void CH;
}

function drawSajuYearHeatmap(ctx: CanvasRenderingContext2D, W: number, H: number, opts: PlannerOptions, useSerif: boolean) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H,
    'YEAR HEATMAP', `12개월 세운 × 오행 분포 · YEAR ${opts.year}`, useSerif);
  const c = TC();
  const s = opts.saju;
  const monthly = s?.monthlyPillars;

  if (!s || !monthly || monthly.length === 0) {
    ctx.font = `300 14px "Noto Serif KR", serif`;
    ctx.fillStyle = '#888';
    ctx.fillText('사주 데이터 + 12개월 세운이 필요합니다 (프리미엄 주문 시 자동 연결).', PAD, startY + 40);
    return;
  }

  // 좌측: 오행 레이더 (간단화된 원형 배지)
  const leftW = 260;
  const rdCx = PAD + leftW / 2;
  const rdCy = startY + 180;
  const rdR = 110;

  ctx.font = `700 14px "Noto Serif KR", serif`;
  ctx.fillStyle = c.textDark;
  ctx.fillText('내 오행 균형', PAD, startY + 28);

  // 5 축
  const elems: ('목'|'화'|'토'|'금'|'수')[] = ['목','화','토','금','수'];
  // elemSummary 파싱: "목3 · 화1 · 토2 · 금1 · 수1"
  const counts: Record<string, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  const mm = (s.elemSummary || '').matchAll(/([목화토금수])(\d+)/g);
  for (const m of mm) counts[m[1]] = parseInt(m[2], 10);
  const maxC = Math.max(1, ...Object.values(counts));

  ctx.strokeStyle = c.ruleFaint;
  ctx.lineWidth = 0.6;
  // 배경 원 3개
  for (let ring = 1; ring <= 3; ring++) {
    ctx.beginPath();
    ctx.arc(rdCx, rdCy, (rdR * ring) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 각 축
  elems.forEach((e, i) => {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    const r = (counts[e] / maxC) * rdR;
    const x = rdCx + Math.cos(a) * r;
    const y = rdCy + Math.sin(a) * r;
    ctx.fillStyle = OHAENG_COLOR[e];
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    // 라벨
    const lx = rdCx + Math.cos(a) * (rdR + 20);
    const ly = rdCy + Math.sin(a) * (rdR + 20);
    ctx.fillStyle = c.textDark;
    ctx.font = `500 13px "Noto Serif KR", serif`;
    ctx.fillText(`${e}${counts[e]}`, lx - 8, ly + 4);
  });
  // 축선
  elems.forEach((_, i) => {
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / 5;
    ctx.strokeStyle = c.ruleFaint;
    ctx.beginPath();
    ctx.moveTo(rdCx, rdCy);
    ctx.lineTo(rdCx + Math.cos(a) * rdR, rdCy + Math.sin(a) * rdR);
    ctx.stroke();
  });

  // 우측: 12개월 월주 히트맵 (3×4 그리드 · 용신 오행은 금테두리, 기신은 붉은 테두리)
  const gridX = PAD + leftW + 40;
  const gridW = W - gridX - PAD;
  const cols = 3;
  const rows = 4;
  const cellW = gridW / cols;
  const cellH = 90;
  const gridY = startY + 30;

  ctx.font = `700 14px "Noto Serif KR", serif`;
  ctx.fillStyle = c.textDark;
  ctx.fillText('12개월 월주 히트맵', gridX, gridY - 8);

  const yongsin = s.yongsin;
  const CTRL: Record<string, string> = { 목:'금', 화:'수', 토:'목', 금:'화', 수:'토' };
  const kiElem = yongsin ? CTRL[yongsin] : '';

  for (let i = 0; i < 12; i++) {
    const m = monthly[i];
    if (!m) continue;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = gridX + col * cellW;
    const cy = gridY + row * cellH;

    // 월주 한글에서 오행 추론
    const ko = m.ko || '';
    // stem 한글 → 오행
    const stemKoArr = ['갑','을','병','정','무','기','경','신','임','계'];
    const stemElemKoArr = ['목','목','화','화','토','토','금','금','수','수'];
    const sIdx = stemKoArr.indexOf(ko[0]);
    const elem = sIdx >= 0 ? stemElemKoArr[sIdx] : '토';
    const color = OHAENG_COLOR[elem] || '#888';

    // 배경
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(cx + 4, cy + 4, cellW - 10, cellH - 10);
    ctx.globalAlpha = 1;

    // 용신/기신 테두리
    if (elem === yongsin) {
      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2.5;
    } else if (elem === kiElem) {
      ctx.strokeStyle = '#c1121f';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = c.ruleFaint;
      ctx.lineWidth = 0.8;
    }
    ctx.strokeRect(cx + 4, cy + 4, cellW - 10, cellH - 10);

    // 월 번호
    ctx.font = `900 26px "Playfair Display", "Noto Serif KR", serif`;
    ctx.fillStyle = c.textDark;
    ctx.fillText(String(m.month).padStart(2, '0'), cx + 14, cy + 34);
    // 월주
    ctx.font = `500 17px "Noto Serif KR", serif`;
    ctx.fillText(ko, cx + 14, cy + 60);
    // 오행
    ctx.font = `400 11px "Noto Sans KR", sans-serif`;
    ctx.fillStyle = c.textMid;
    ctx.fillText(elem, cx + 14, cy + 78);
  }

  // 범례
  const legendY2 = gridY + rows * cellH + 12;
  ctx.font = `300 11px "Noto Sans KR", sans-serif`;
  ctx.fillStyle = c.textMid;
  ctx.fillText('◆ 금색 테두리 = 용신 달 (기회) · ◇ 붉은 테두리 = 기신 달 (보존)', gridX, legendY2);
  void CH;
}

// ═══════════════════════════════════════════════════════════════
// 메인 라우터
// ═══════════════════════════════════════════════════════════════
export function drawExtraPage(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  pageType: ExtraPageType,
): void {
  const useSerif = opts.mode !== 'practice';

  switch (pageType) {
    // ── 카테고리 그리드 ─────────────────────────
    case 'inspiration':
      drawCatGrid(ctx, W, H, 'INSPIRATION', ['팟캐스트', '도서', '음악', '영상', '강의', '오디오'], 3, 6, useSerif);
      break;
    case 'shopping':
      drawCatGrid(ctx, W, H, 'SHOPPING LIST', ['유제품', '농산물', '육류', '과일·채소', '냉동', '기타'], 3, 6, useSerif);
      break;
    case 'bucket-list':
      drawCatGrid(ctx, W, H, 'BUCKET LIST', ['개인', '가족', '여행', '재무', '직장', '기타'], 3, 8, useSerif);
      break;
    case 'vision-board':
      drawCatGrid(ctx, W, H, 'VISION BOARD', ['커리어', '가족', '사회생활', '환경', '재정', '건강', '자기계발', '친구'], 4, 0, useSerif);
      break;

    // ── 월별 그리드 ─────────────────────────────
    case 'year-glance':
      drawMonthGrid(ctx, W, H, 'YEAR AT A GLANCE', 5, false, useSerif);
      break;
    case 'important-dates':
      drawMonthGrid(ctx, W, H, 'IMPORTANT DATES', 6, true, useSerif);
      break;
    case 'birthday-cal':
      drawMonthGrid(ctx, W, H, 'BIRTHDAY CALENDAR', 6, true, useSerif);
      break;

    // ── 테이블 ──────────────────────────────────
    case 'savings':
      drawTablePage(ctx, W, H, 'SAVINGS TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.25 }, { label: 'DEPOSIT', width: 0.4 }, { label: 'BALANCE', width: 0.35 }],
        20, true, useSerif);
      break;
    case 'budget':
      drawTablePage(ctx, W, H, 'BUDGET TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.15 }, { label: 'DESCRIPTION', width: 0.4 }, { label: 'AMOUNT', width: 0.2 }, { label: 'BALANCE', width: 0.25 }],
        20, true, useSerif);
      break;
    case 'expense':
      drawTablePage(ctx, W, H, 'EXPENSE TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.12 }, { label: 'CATEGORY', width: 0.2 }, { label: 'DESCRIPTION', width: 0.33 }, { label: 'AMOUNT', width: 0.15 }, { label: 'BALANCE', width: 0.2 }],
        22, true, useSerif);
      break;
    case 'habit-tracker':
      drawTablePage(ctx, W, H, 'HABIT TRACKER', 'WEEK OF: ________',
        [{ label: 'HABIT', width: 0.44 }, { label: 'M', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'W', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'F', width: 0.08 }, { label: 'S', width: 0.08 }, { label: 'S', width: 0.08 }],
        15, false, useSerif);
      break;
    case 'selfcare':
      drawTablePage(ctx, W, H, 'SELF CARE CHECKLIST', 'WEEK OF: ________',
        [{ label: 'SELF CARE TASK', width: 0.44 }, { label: 'M', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'W', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'F', width: 0.08 }, { label: 'S', width: 0.08 }, { label: 'S', width: 0.08 }],
        18, false, useSerif);
      break;
    case 'household':
      drawSectionsPage(ctx, W, H, 'MONTHLY HOUSEHOLD BUDGET', 'MONTH: ________    YEAR: ________', [
        { label: '주거비 (HOME)', style: 'free', lines: 3 },
        { label: '공과금 (UTILITIES)', style: 'free', lines: 3 },
        { label: '교통비 (TRANSPORTATION)', style: 'free', lines: 3 },
        { label: '보험 (INSURANCE)', style: 'free', lines: 2 },
        { label: '기타 (OTHERS)', style: 'free', lines: 2 },
      ], useSerif);
      break;

    // ── 섹션 ────────────────────────────────────
    case 'journal':
      drawSectionsPage(ctx, W, H, 'DAILY JOURNAL', 'DATE: ________    S M T W T F S', [
        { label: '아침 성찰 (MORNING REFLECTIONS)', style: 'dotted', lines: 5 },
        { label: '감사 (GRATITUDE)', style: 'dotted', lines: 3 },
        { label: '하루 돌아보기 (DAY & EVENING REFLECTIONS)', style: 'dotted', lines: 5 },
        { label: '감사 (GRATITUDE)', style: 'dotted', lines: 3 },
        { label: '내일 계획 (PLAN FOR TOMORROW?)', style: 'dotted', lines: 3 },
      ], useSerif);
      break;
    case 'gratitude':
      drawSectionsPage(ctx, W, H, 'DAILY GRATITUDE JOURNAL', 'DATE: ________    S M T W T F S', [
        { label: '감사한 3가지 (THREE THINGS I\'M GRATEFUL FOR)', style: 'dotted', lines: 5 },
        { label: '자랑스러운 1가지 (ONE THING I\'M PROUD OF)', style: 'dotted', lines: 4 },
        { label: '감사한 사람 (THE PERSON I\'M GRATEFUL FOR)', style: 'dotted', lines: 4 },
        { label: '오늘 최고의 순간 (THE BEST PART ABOUT TODAY)', style: 'dotted', lines: 5 },
      ], useSerif);
      break;
    case 'yearly-review':
      drawSectionsPage(ctx, W, H, 'YEARLY REVIEW', 'YEAR: ________', [
        { label: '올해 최고의 성취 5가지 (MY TOP 5 ACHIEVEMENTS)', style: 'check', lines: 5 },
        { label: '잘한 점 (WHAT WENT WELL)', style: 'free', lines: 6 },
        { label: '가장 큰 도전 (MY BIGGEST CHALLENGES)', style: 'free', lines: 5 },
        { label: '감사합니다 (I AM GRATEFUL FOR)', style: 'free', lines: 5 },
      ], useSerif);
      break;
    case 'weekly-reflection':
      drawCatGrid(ctx, W, H, 'WEEKLY REFLECTION',
        ['좋았던 순간', '더 하고 싶은 것', '감사한 것', '줄이고 싶은 것', '주요 성과', '기대하는 것'], 3, 5, useSerif);
      break;
    case 'monthly-goals':
      drawSectionsPage(ctx, W, H, 'MONTHLY GOALS', 'MONTH: ________    YEAR: ________', [
        { label: '이달의 포커스 (FOCUS)', style: 'free', lines: 2 },
        { label: '목표 #1 (GOAL #1)', style: 'check', lines: 4 },
        { label: '목표 #2 (GOAL #2)', style: 'check', lines: 4 },
        { label: '목표 #3 (GOAL #3)', style: 'check', lines: 4 },
        { label: '재미있는 것 (FUN THINGS)', style: 'free', lines: 2 },
      ], useSerif);
      break;

    // ── 2열 복합 ────────────────────────────────
    case 'daily-alt':
      drawTwoCol(ctx, W, H, 'DAILY PLANNER', 'DATE: ________    S M T W T F S',
        [{ label: 'SCHEDULE (7~6)', lines: 12 }, { label: 'TO CALL/EMAIL', lines: 8 }],
        [{ label: 'TOP PRIORITIES', lines: 3, style: 'check' }, { label: 'MUST GET DONE', lines: 3, style: 'check' }, { label: 'TO-DO LIST', lines: 8, style: 'check' }, { label: 'FOR TOMORROW', lines: 4, style: 'check' }],
        useSerif,
      );
      break;
    case 'weekly-alt':
      drawTwoCol(ctx, W, H, 'WEEKLY PLANNER', 'WEEK OF: ________    YEAR: ________',
        [{ label: 'SUNDAY', lines: 3 }, { label: 'MONDAY', lines: 3 }, { label: 'TUESDAY', lines: 3 }, { label: 'WEDNESDAY', lines: 3 }, { label: 'THURSDAY', lines: 3 }, { label: 'FRIDAY', lines: 3 }, { label: 'SATURDAY', lines: 3 }],
        [{ label: 'TO-DO LIST', lines: 10, style: 'check' }, { label: 'PRIORITIES', lines: 8, style: 'line' }],
        useSerif,
      );
      break;
    case 'meal-plan':
      drawTwoCol(ctx, W, H, 'WEEKLY MEAL PLAN', 'WEEK OF: ________',
        [{ label: 'SUNDAY', lines: 3 }, { label: 'MONDAY', lines: 3 }, { label: 'TUESDAY', lines: 3 }, { label: 'WEDNESDAY', lines: 3 }, { label: 'THURSDAY', lines: 3 }, { label: 'FRIDAY', lines: 3 }, { label: 'SATURDAY', lines: 3 }],
        [{ label: 'FAVORITE DISHES', lines: 6, style: 'line' }, { label: 'SHOPPING LIST', lines: 8, style: 'line' }, { label: 'NOTES', lines: 4, style: 'line' }],
        useSerif,
      );
      break;
    case 'travel':
      drawTwoCol(ctx, W, H, 'TRAVEL PLANNER', '',
        [{ label: 'WHERE / WHEN', lines: 2 }, { label: 'PLACE TO VISIT', lines: 5 }, { label: 'VACATION ADDRESS', lines: 3 }, { label: 'SIGHTS TO SEE', lines: 4 }],
        [{ label: 'EXPENSE (BUDGET / ACTUAL)', lines: 6, style: 'line' }, { label: 'TOURS/EXCURSIONS', lines: 4, style: 'line' }, { label: 'TRAVEL INFO', lines: 4, style: 'line' }],
        useSerif,
      );
      break;
    case 'contacts':
      drawSectionsPage(ctx, W, H, 'CONTACT LIST', '', [
        { label: '연락처 1', style: 'free', lines: 3 },
        { label: '연락처 2', style: 'free', lines: 3 },
        { label: '연락처 3', style: 'free', lines: 3 },
        { label: '연락처 4', style: 'free', lines: 3 },
        { label: '연락처 5', style: 'free', lines: 3 },
      ], useSerif);
      break;

    // ── 단순 리스트 ─────────────────────────────
    case 'todo':
      drawSimplePage(ctx, W, H, 'TO-DO LIST', 'DATE: ________', 'check', 20, useSerif);
      break;
    case 'notes-lined':
      drawSimplePage(ctx, W, H, 'NOTES', 'DATE: ________', 'lined', 28, useSerif);
      break;
    case 'notes-grid':
      drawSimplePage(ctx, W, H, 'NOTES', 'DATE: ________', 'grid', 0, useSerif);
      break;
    case 'one-line-day':
      drawSimplePage(ctx, W, H, 'ONE LINE A DAY', 'MONTH: ________    YEAR: ________', 'numbered', 31, useSerif);
      break;
    case 'yearly-goals':
      drawSimplePage(ctx, W, H, 'YEARLY GOALS', 'YEAR: ________', 'goals', 20, useSerif);
      break;

    // ── 사주 능동 설계 페이지 ─────────────────────────────────
    case 'saju-year-design':
      drawSajuYearDesign(ctx, W, H, opts, useSerif);
      break;
    case 'saju-month-strategy':
      drawSajuMonthStrategy(ctx, W, H, opts, useSerif);
      break;
    case 'saju-decision-canvas':
      drawSajuDecisionCanvas(ctx, W, H, opts, useSerif);
      break;
    case 'saju-problem-dig':
      drawSajuProblemDig(ctx, W, H, opts, useSerif);
      break;
    case 'saju-weekly-rhythm':
      drawSajuWeeklyRhythm(ctx, W, H, opts, useSerif);
      break;
    case 'saju-daeun-timeline':
      drawSajuDaeunTimeline(ctx, W, H, opts, useSerif);
      break;
    case 'saju-year-heatmap':
      drawSajuYearHeatmap(ctx, W, H, opts, useSerif);
      break;
  }

  // v2 공통 푸터 — 모든 부록 페이지 하단
  const config = EXTRA_PAGES.find(e => e.type === pageType);
  drawExtraFooter(ctx, W, H, `— ${config?.title ?? pageType.toUpperCase()} —`);
}
