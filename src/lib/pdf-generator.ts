/**
 * FortuneTab Client-side PDF Generator v4
 * Canvas 2D API → jsPDF · 브라우저 전용
 *
 * v4 신기능:
 *   - 7가지 컬러 테마 (로즈/네이비/블랙/블루/포레스트/오렌지/골드)
 *   - 주간: ISO 주차 기반 실제 날짜 표시 (월~일 순서)
 *   - 월간/주간: 공휴일·기념일 셀 색상 표시
 *   - 연간 인덱스 → 월간 / 월간 → 주간 내부 하이퍼링크
 *   - 월간 헤더 ◀ / ▶ 이전·다음 달 이동 하이퍼링크
 */

// ── 타입 re-export (하위 호환성) ─────────────────────────────────────────────
export type { Orientation, PageType, NavLink, SajuData, PlannerOptions } from './pdf-utils';
export { calculateSaju } from './saju';

import { getTheme } from './pdf-themes';
import {
  themeHolder,
  PORTRAIT_W, PORTRAIT_H,
  NAV_H_RATIO, NAV_SECTIONS, MONTHS_KO,
  getISOWeek,
  type PageType, type NavLink, type PlannerOptions,
} from './pdf-utils';
import { drawCover, drawYearIndex, drawMonthly, drawWeekly, drawDaily } from './pdf-pages';
import { drawExtraPage, EXTRA_PAGES, type ExtraPageType } from './pdf-pages-extras';

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
  themeHolder.T = getTheme(opts.theme);
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const W = canvas.width;
  const H = canvas.height;

  if (pageType === 'cover')      drawCover(ctx, W, H, opts);
  else if (pageType === 'year-index') drawYearIndex(ctx, W, H, opts);
  else if (pageType === 'monthly')    drawMonthly(ctx, W, H, opts, pageIdx);
  else if (pageType === 'weekly')     drawWeekly(ctx, W, H, opts, pageIdx || 1);
  else if (pageType === 'daily')      drawDaily(ctx, W, H, opts);
  else drawExtraPage(ctx, W, H, opts, pageType as ExtraPageType);
}

export async function generatePlannerPDF(opts: PlannerOptions): Promise<Blob | void> {
  const { jsPDF } = await import('jspdf');

  // 테마 설정
  themeHolder.T = getTheme(opts.theme);

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
      // 해당 연도의 마지막 ISO 주차 계산 (52 또는 53)
      const dec31 = new Date(opts.year, 11, 31);
      const lastWeek = getISOWeek(dec31);
      // 12/31이 다음해 1주차에 속하면 12/28로 재확인
      const maxWeek = lastWeek === 1 ? getISOWeek(new Date(opts.year, 11, 28)) : lastWeek;
      for (let w = 1; w <= maxWeek; w++)
        expandedPages.push({ type: 'weekly', label: `${w}주차`, idx: w });
    } else if (p === 'daily') {
      expandedPages.push({ type: 'daily', label: '일간 플래너 샘플' });
    } else if (p === 'cover') {
      expandedPages.push({ type: 'cover', label: '커버 페이지' });
    } else if (p === 'year-index') {
      expandedPages.push({ type: 'year-index', label: '연간 인덱스' });
    } else {
      // 부록 페이지 (28종)
      const extra = EXTRA_PAGES.find(e => e.type === p);
      if (extra) {
        expandedPages.push({ type: p, label: extra.titleKo });
      }
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
    } else {
      // 부록 페이지
      drawExtraPage(ctx, CW, CH, opts, page.type as ExtraPageType);
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

  // returnBlob 모드: 서버 사이드 PDF 생성용 (다운로드 대신 Blob 반환)
  if (opts.returnBlob) {
    return doc.output('blob');
  }

  doc.save(`fortunetab_${opts.year}_planner_${opts.orientation}.pdf`);
}
