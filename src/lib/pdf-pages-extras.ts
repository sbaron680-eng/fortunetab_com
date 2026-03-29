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
  type PlannerOptions,
} from './pdf-utils';

// ── 테마/색상 접근 ─────────────────────────────────────────────
import { themeHolder } from './pdf-utils';

function C() {
  return {
    bgPage: '#faf9f7', bgCard: '#ffffff',
    textDark: '#111111', textMid: '#444444', textLight: '#888888',
    ruleColor: '#e0dbd4', ruleFaint: '#eeebe6',
    headerBg: '#f0eeeb',
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
  | 'todo' | 'notes-lined' | 'notes-grid';

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
];

// ── 공통 유틸 ──────────────────────────────────────────────────
function drawPageHeader(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, subtitle?: string,
) {
  const c = C();
  const NAV_H = Math.round(H * NAV_H_RATIO);
  const CH = H - NAV_H;
  const PAD = PAGE_PAD;

  ctx.fillStyle = c.bgPage;
  ctx.fillRect(0, 0, W, CH);

  // 제목
  ctx.font = F(28, true, true);
  ctx.fillStyle = c.textDark;
  const tw = ctx.measureText(title).width;
  ctx.fillText(title, (W - tw) / 2, PAD + 30);

  // 구분선
  ctx.strokeStyle = c.textDark;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, PAD + 42);
  ctx.lineTo(W - PAD, PAD + 42);
  ctx.stroke();

  // 부제
  if (subtitle) {
    ctx.font = F(14, false, false);
    ctx.fillStyle = c.textLight;
    const sw = ctx.measureText(subtitle).width;
    ctx.fillText(subtitle, W - PAD - sw, PAD + 68);
  }

  return { CH, PAD, startY: PAD + 80 };
}

function drawCheckbox(ctx: CanvasRenderingContext2D, x: number, y: number, size = 14) {
  const c = C();
  ctx.strokeStyle = c.ruleColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);
}

function drawCircleCheck(ctx: CanvasRenderingContext2D, x: number, y: number, r = 7) {
  const c = C();
  ctx.strokeStyle = c.ruleColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSectionHeader(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string) {
  const c = C();
  ctx.fillStyle = c.headerBg;
  ctx.fillRect(x, y, w, h);
  ctx.font = F(12, true, false);
  ctx.fillStyle = c.textDark;
  const tw = ctx.measureText(label).width;
  ctx.fillText(label, x + (w - tw) / 2, y + h * 0.68);
}

// ═══════════════════════════════════════════════════════════════
// 패턴 1: 카테고리 그리드 (2×N)
// ═══════════════════════════════════════════════════════════════
function drawCatGrid(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  title: string, categories: string[], rows: number, checkLines: number,
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, `YEAR: ________`);
  const c = C();
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
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, `YEAR: ________`);
  const c = C();
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
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, subtitle);
  const c = C();
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
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel);
  const c = C();
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
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel);
  const c = C();
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
) {
  const { CH, PAD, startY } = drawPageHeader(ctx, W, H, title, dateLabel);
  const c = C();

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
// 메인 라우터
// ═══════════════════════════════════════════════════════════════
export function drawExtraPage(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  _opts: PlannerOptions,
  pageType: ExtraPageType,
): void {
  switch (pageType) {
    // ── 카테고리 그리드 ─────────────────────────
    case 'inspiration':
      drawCatGrid(ctx, W, H, 'INSPIRATION', ['팟캐스트', '도서', '음악', '영상', '강의', '오디오'], 3, 6);
      break;
    case 'shopping':
      drawCatGrid(ctx, W, H, 'SHOPPING LIST', ['유제품', '농산물', '육류', '과일·채소', '냉동', '기타'], 3, 6);
      break;
    case 'bucket-list':
      drawCatGrid(ctx, W, H, 'BUCKET LIST', ['개인', '가족', '여행', '재무', '직장', '기타'], 3, 8);
      break;
    case 'vision-board':
      drawCatGrid(ctx, W, H, 'VISION BOARD', ['커리어', '가족', '사회생활', '환경', '재정', '건강', '자기계발', '친구'], 4, 0);
      break;

    // ── 월별 그리드 ─────────────────────────────
    case 'year-glance':
      drawMonthGrid(ctx, W, H, 'YEAR AT A GLANCE', 5, false);
      break;
    case 'important-dates':
      drawMonthGrid(ctx, W, H, 'IMPORTANT DATES', 6, true);
      break;
    case 'birthday-cal':
      drawMonthGrid(ctx, W, H, 'BIRTHDAY CALENDAR', 6, true);
      break;

    // ── 테이블 ──────────────────────────────────
    case 'savings':
      drawTablePage(ctx, W, H, 'SAVINGS TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.25 }, { label: 'DEPOSIT', width: 0.4 }, { label: 'BALANCE', width: 0.35 }],
        20, true);
      break;
    case 'budget':
      drawTablePage(ctx, W, H, 'BUDGET TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.15 }, { label: 'DESCRIPTION', width: 0.4 }, { label: 'AMOUNT', width: 0.2 }, { label: 'BALANCE', width: 0.25 }],
        20, true);
      break;
    case 'expense':
      drawTablePage(ctx, W, H, 'EXPENSE TRACKER', 'MONTH: ________    YEAR: ________',
        [{ label: 'DATE', width: 0.12 }, { label: 'CATEGORY', width: 0.2 }, { label: 'DESCRIPTION', width: 0.33 }, { label: 'AMOUNT', width: 0.15 }, { label: 'BALANCE', width: 0.2 }],
        22, true);
      break;
    case 'habit-tracker':
      drawTablePage(ctx, W, H, 'HABIT TRACKER', 'WEEK OF: ________',
        [{ label: 'HABIT', width: 0.44 }, { label: 'M', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'W', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'F', width: 0.08 }, { label: 'S', width: 0.08 }, { label: 'S', width: 0.08 }],
        15, false);
      break;
    case 'selfcare':
      drawTablePage(ctx, W, H, 'SELF CARE CHECKLIST', 'WEEK OF: ________',
        [{ label: 'SELF CARE TASK', width: 0.44 }, { label: 'M', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'W', width: 0.08 }, { label: 'T', width: 0.08 }, { label: 'F', width: 0.08 }, { label: 'S', width: 0.08 }, { label: 'S', width: 0.08 }],
        18, false);
      break;
    case 'household':
      drawSectionsPage(ctx, W, H, 'MONTHLY HOUSEHOLD BUDGET', 'MONTH: ________    YEAR: ________', [
        { label: '주거비 (HOME)', style: 'free', lines: 3 },
        { label: '공과금 (UTILITIES)', style: 'free', lines: 3 },
        { label: '교통비 (TRANSPORTATION)', style: 'free', lines: 3 },
        { label: '보험 (INSURANCE)', style: 'free', lines: 2 },
        { label: '기타 (OTHERS)', style: 'free', lines: 2 },
      ]);
      break;

    // ── 섹션 ────────────────────────────────────
    case 'journal':
      drawSectionsPage(ctx, W, H, 'DAILY JOURNAL', 'DATE: ________    S M T W T F S', [
        { label: '아침 성찰 (MORNING REFLECTIONS)', style: 'dotted', lines: 5 },
        { label: '감사 (GRATITUDE)', style: 'dotted', lines: 3 },
        { label: '하루 돌아보기 (DAY & EVENING REFLECTIONS)', style: 'dotted', lines: 5 },
        { label: '감사 (GRATITUDE)', style: 'dotted', lines: 3 },
        { label: '내일 계획 (PLAN FOR TOMORROW?)', style: 'dotted', lines: 3 },
      ]);
      break;
    case 'gratitude':
      drawSectionsPage(ctx, W, H, 'DAILY GRATITUDE JOURNAL', 'DATE: ________    S M T W T F S', [
        { label: '감사한 3가지 (THREE THINGS I\'M GRATEFUL FOR)', style: 'dotted', lines: 5 },
        { label: '자랑스러운 1가지 (ONE THING I\'M PROUD OF)', style: 'dotted', lines: 4 },
        { label: '감사한 사람 (THE PERSON I\'M GRATEFUL FOR)', style: 'dotted', lines: 4 },
        { label: '오늘 최고의 순간 (THE BEST PART ABOUT TODAY)', style: 'dotted', lines: 5 },
      ]);
      break;
    case 'yearly-review':
      drawSectionsPage(ctx, W, H, 'YEARLY REVIEW', 'YEAR: ________', [
        { label: '올해 최고의 성취 5가지 (MY TOP 5 ACHIEVEMENTS)', style: 'check', lines: 5 },
        { label: '잘한 점 (WHAT WENT WELL)', style: 'free', lines: 6 },
        { label: '가장 큰 도전 (MY BIGGEST CHALLENGES)', style: 'free', lines: 5 },
        { label: '감사합니다 (I AM GRATEFUL FOR)', style: 'free', lines: 5 },
      ]);
      break;
    case 'weekly-reflection':
      drawCatGrid(ctx, W, H, 'WEEKLY REFLECTION',
        ['좋았던 순간', '더 하고 싶은 것', '감사한 것', '줄이고 싶은 것', '주요 성과', '기대하는 것'], 3, 5);
      break;
    case 'monthly-goals':
      drawSectionsPage(ctx, W, H, 'MONTHLY GOALS', 'MONTH: ________    YEAR: ________', [
        { label: '이달의 포커스 (FOCUS)', style: 'free', lines: 2 },
        { label: '목표 #1 (GOAL #1)', style: 'check', lines: 4 },
        { label: '목표 #2 (GOAL #2)', style: 'check', lines: 4 },
        { label: '목표 #3 (GOAL #3)', style: 'check', lines: 4 },
        { label: '재미있는 것 (FUN THINGS)', style: 'free', lines: 2 },
      ]);
      break;

    // ── 2열 복합 ────────────────────────────────
    case 'daily-alt':
      drawTwoCol(ctx, W, H, 'DAILY PLANNER', 'DATE: ________    S M T W T F S',
        [{ label: 'SCHEDULE (7~6)', lines: 12 }, { label: 'TO CALL/EMAIL', lines: 8 }],
        [{ label: 'TOP PRIORITIES', lines: 3, style: 'check' }, { label: 'MUST GET DONE', lines: 3, style: 'check' }, { label: 'TO-DO LIST', lines: 8, style: 'check' }, { label: 'FOR TOMORROW', lines: 4, style: 'check' }],
      );
      break;
    case 'weekly-alt':
      drawTwoCol(ctx, W, H, 'WEEKLY PLANNER', 'WEEK OF: ________    YEAR: ________',
        [{ label: 'SUNDAY', lines: 3 }, { label: 'MONDAY', lines: 3 }, { label: 'TUESDAY', lines: 3 }, { label: 'WEDNESDAY', lines: 3 }, { label: 'THURSDAY', lines: 3 }, { label: 'FRIDAY', lines: 3 }, { label: 'SATURDAY', lines: 3 }],
        [{ label: 'TO-DO LIST', lines: 10, style: 'check' }, { label: 'PRIORITIES', lines: 8, style: 'line' }],
      );
      break;
    case 'meal-plan':
      drawTwoCol(ctx, W, H, 'WEEKLY MEAL PLAN', 'WEEK OF: ________',
        [{ label: 'SUNDAY', lines: 3 }, { label: 'MONDAY', lines: 3 }, { label: 'TUESDAY', lines: 3 }, { label: 'WEDNESDAY', lines: 3 }, { label: 'THURSDAY', lines: 3 }, { label: 'FRIDAY', lines: 3 }, { label: 'SATURDAY', lines: 3 }],
        [{ label: 'FAVORITE DISHES', lines: 6, style: 'line' }, { label: 'SHOPPING LIST', lines: 8, style: 'line' }, { label: 'NOTES', lines: 4, style: 'line' }],
      );
      break;
    case 'travel':
      drawTwoCol(ctx, W, H, 'TRAVEL PLANNER', '',
        [{ label: 'WHERE / WHEN', lines: 2 }, { label: 'PLACE TO VISIT', lines: 5 }, { label: 'VACATION ADDRESS', lines: 3 }, { label: 'SIGHTS TO SEE', lines: 4 }],
        [{ label: 'EXPENSE (BUDGET / ACTUAL)', lines: 6, style: 'line' }, { label: 'TOURS/EXCURSIONS', lines: 4, style: 'line' }, { label: 'TRAVEL INFO', lines: 4, style: 'line' }],
      );
      break;
    case 'contacts':
      drawSectionsPage(ctx, W, H, 'CONTACT LIST', '', [
        { label: '연락처 1', style: 'free', lines: 3 },
        { label: '연락처 2', style: 'free', lines: 3 },
        { label: '연락처 3', style: 'free', lines: 3 },
        { label: '연락처 4', style: 'free', lines: 3 },
        { label: '연락처 5', style: 'free', lines: 3 },
      ]);
      break;

    // ── 단순 리스트 ─────────────────────────────
    case 'todo':
      drawSimplePage(ctx, W, H, 'TO-DO LIST', 'DATE: ________', 'check', 20);
      break;
    case 'notes-lined':
      drawSimplePage(ctx, W, H, 'NOTES', 'DATE: ________', 'lined', 28);
      break;
    case 'notes-grid':
      drawSimplePage(ctx, W, H, 'NOTES', 'DATE: ________', 'grid', 0);
      break;
    case 'one-line-day':
      drawSimplePage(ctx, W, H, 'ONE LINE A DAY', 'MONTH: ________    YEAR: ________', 'numbered', 31);
      break;
    case 'yearly-goals':
      drawSimplePage(ctx, W, H, 'YEARLY GOALS', 'YEAR: ________', 'goals', 20);
      break;
  }
}
