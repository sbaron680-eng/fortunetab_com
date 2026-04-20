/**
 * FortuneTab PDF Page Drawers — v2 "New Eastern Editorial"
 *
 * 5 main pages: cover · year-index · monthly · weekly · daily
 * 디자인 언어: 미색 종이 + 먹선 + 큰 Playfair 숫자 + 낙관(인장) + 세로 한자
 *
 * Content area: [0, CH] where CH = H - NAV_H (NAV_H_RATIO=0.028)
 * 하단 네비게이션 탭은 drawNavBar가 [CH, H] 영역에 그립니다.
 */

import { getHoliday, getSolarTerm } from './korean-holidays';
import {
  themeHolder,
  PAD_V2, LH, SECTION_HEAD_H, TITLE_ZONE_H,
  INK_V2, INK_FAINT_V2, SEAL_V2,
  NAV_H_RATIO,
  SERIF,
  drawPaperV2, drawHeaderV2, drawFooterV2, drawTitleDividerV2,
  drawSectionHeadV2, drawMemoLinesV2,
  drawNavBar,
  firstDayOf, daysInMonth, getWeekDates, getISOWeek,
  type NavLink, type PlannerOptions,
} from './pdf-utils';

// ── 간지·절기 상수 ───────────────────────────────────────────────────────────
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const DAYS_EN = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const DAYS_EN_FULL = ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'];
const DAYS_SHORT = ['S','M','T','W','T','F','S'];
const DAYS_KANJI = ['日','月','火','水','木','金','土'];
const DAYS_KO_SHORT = ['일','월','화','수','목','금','토'];
const MONTHS_EN = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

function yearGanzhi(year: number): string {
  // 1984 = 甲子
  const idx = ((year - 1984) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}
function dayGanzhi(year: number, month: number, day: number): string {
  // 1984-01-31 = 甲子日 (이후 매일 +1)
  const base = new Date(1984, 0, 31).getTime();
  const target = new Date(year, month - 1, day).getTime();
  const days = Math.floor((target - base) / 86400000);
  const idx = ((days) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}
function monthGanzhi(year: number, month: number): string {
  // Base: Jan 2026 = 己丑 (index 25)
  const total = (year - 2026) * 12 + (month - 1);
  const idx = ((25 + total) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}

// 12시진
const SHICHEN = [
  { kanji: '子', name: '자시', range: '23:00 — 01:00', glyph: '鼠' },
  { kanji: '丑', name: '축시', range: '01:00 — 03:00', glyph: '牛' },
  { kanji: '寅', name: '인시', range: '03:00 — 05:00', glyph: '虎' },
  { kanji: '卯', name: '묘시', range: '05:00 — 07:00', glyph: '兔' },
  { kanji: '辰', name: '진시', range: '07:00 — 09:00', glyph: '龍' },
  { kanji: '巳', name: '사시', range: '09:00 — 11:00', glyph: '蛇' },
  { kanji: '午', name: '오시', range: '11:00 — 13:00', glyph: '馬' },
  { kanji: '未', name: '미시', range: '13:00 — 15:00', glyph: '羊' },
  { kanji: '申', name: '신시', range: '15:00 — 17:00', glyph: '猴' },
  { kanji: '酉', name: '유시', range: '17:00 — 19:00', glyph: '鷄' },
  { kanji: '戌', name: '술시', range: '19:00 — 21:00', glyph: '狗' },
  { kanji: '亥', name: '해시', range: '21:00 — 23:00', glyph: '豬' },
];

// 월별 테마·키워드 (인사이트)
const MONTH_THEMES: Record<number, { theme: string; kw: string[] }> = {
  1:  { theme: '시작의 달',     kw: ['씨앗', '숙고', '고요'] },
  2:  { theme: '움틈의 달',     kw: ['전환', '발아', '탐색'] },
  3:  { theme: '펼침의 달',     kw: ['확장', '연결', '약속'] },
  4:  { theme: '성장의 달',     kw: ['실행', '속도', '신뢰'] },
  5:  { theme: '뿌리의 달',     kw: ['기반', '관계', '투자'] },
  6:  { theme: '결실의 달',     kw: ['마감', '점검', '정산'] },
  7:  { theme: '열기의 달',     kw: ['집중', '몰입', '단련'] },
  8:  { theme: '수렴의 달',     kw: ['정리', '재정비', '회복'] },
  9:  { theme: '수확의 달',     kw: ['성과', '나눔', '감사'] },
  10: { theme: '가다듬는 달',   kw: ['품질', '정제', '기록'] },
  11: { theme: '갈무리의 달',   kw: ['회고', '결산', '정돈'] },
  12: { theme: '맺음의 달',     kw: ['완결', '감사', '재설계'] },
};

// ── 내부 헬퍼 ────────────────────────────────────────────────────────────────
function setLS(ctx: CanvasRenderingContext2D, v: string) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (c.letterSpacing !== undefined) c.letterSpacing = v;
}
function getCH(H: number): number {
  return H - Math.round(H * NAV_H_RATIO);
}
function titleDividerY(): number {
  return PAD_V2 + 14 + TITLE_ZONE_H; // = PAD_V2 + 214
}
/**
 * 월간 달력 행의 대표 ISO 주차를 계산.
 * 달력 행은 일~토 순이라 경계 주(Jan 1-3 Thu-Sat, 또는 Jan 4 일요일) 같은
 * 엣지 케이스가 존재. 가장 안전한 방법: 해당 행에서 월~목(slot%7 in 1..4) 중
 * 이번 달에 속하는 첫 번째 날짜를 찾아 getISOWeek 호출.
 * 평일이 하나도 없으면(행 전체가 금·토·일) 행의 첫 유효 날짜로 폴백.
 */
function representativeIsoWeek(year: number, month: number, start: number, days: number, row: number): number | null {
  // 평일(월~목) 우선
  for (let d = 1; d <= days; d++) {
    const slot = start + d - 1;
    if (Math.floor(slot / 7) !== row) continue;
    const col = slot % 7;
    if (col >= 1 && col <= 4) {
      return getISOWeek(new Date(year, month - 1, d));
    }
  }
  // 폴백: 행의 첫 유효 날짜
  for (let d = 1; d <= days; d++) {
    if (Math.floor((start + d - 1) / 7) === row) {
      return getISOWeek(new Date(year, month - 1, d));
    }
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
//  1. COVER
// ════════════════════════════════════════════════════════════════════════════

interface CoverVariant {
  title: string;
  subtitle: string;
  verticalKanji: string[];
}

function getCoverVariant(style: PlannerOptions['coverStyle']): CoverVariant {
  switch (style) {
    case 'practice':
      return { title: '실천 플래너', subtitle: '목표 달성 · 습관 형성 · 실천력 강화',
        verticalKanji: ['意','志','成','就'] };
    case 'premium':
      return { title: '사주 플래너 프리미엄', subtitle: '20페이지 심층 사주 리포트 포함',
        verticalKanji: ['運','命','深','析'] };
    case 'extras':
      return { title: '부록 플래너', subtitle: '재정 · 습관 · 여행 · 명상 · 28종 부록',
        verticalKanji: ['附','錄','全','集'] };
    case 'allinone':
      return { title: '라이프 플래너 올인원', subtitle: '사주 · 실천 · 부록 통합',
        verticalKanji: ['全','心','全','力'] };
    case 'fortune':
    default:
      return { title: '사주로 쓰는 365일', subtitle: '동양의 지혜 · 서양의 별을 만나다',
        verticalKanji: ['運','命','之','曆'] };
  }
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
  const T = themeHolder.T;
  const CH = getCH(H);
  const style = opts.coverStyle ?? (opts.mode === 'practice' ? 'practice' : 'fortune');
  const variant = getCoverVariant(style);

  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // 좌측 세로 한자
  ctx.save();
  ctx.font = `300 54px ${SERIF}`;
  ctx.fillStyle = T.accentDeep; ctx.globalAlpha = 0.82;
  let ky = PAD_V2 + 210;
  variant.verticalKanji.forEach(ch => { ctx.fillText(ch, PAD_V2 + 8, ky); ky += 82; });
  ctx.restore();
  ctx.strokeStyle = T.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(PAD_V2 + 62, PAD_V2 + 170); ctx.lineTo(PAD_V2 + 62, ky + 20); ctx.stroke();
  ctx.globalAlpha = 1;

  // 우측 거대 연도
  const year = String(opts.year);
  ctx.font = '900 360px "Playfair Display", "Noto Serif KR", serif';
  const yearW = ctx.measureText(year).width;
  const yearX = W - PAD_V2 - yearW + 20;
  const yearY = CH * 0.52;
  ctx.save(); ctx.globalAlpha = 0.10;
  ctx.fillStyle = T.accentDeep; ctx.fillText(year, yearX + 2, yearY + 3); ctx.restore();
  ctx.fillStyle = T.accent; ctx.globalAlpha = 0.95;
  ctx.fillText(year, yearX, yearY); ctx.globalAlpha = 1;

  // 연도 아래 먹선 + 간지
  ctx.strokeStyle = INK_V2; ctx.lineWidth = 0.8; ctx.globalAlpha = 0.5;
  ctx.beginPath(); ctx.moveTo(yearX + 20, yearY + 24); ctx.lineTo(W - PAD_V2, yearY + 24); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = `400 22px ${SERIF}`;
  ctx.fillStyle = INK_V2; ctx.globalAlpha = 0.72;
  const gz = yearGanzhi(opts.year) + '年';
  const gzW = ctx.measureText(gz).width;
  ctx.fillText(gz, W - PAD_V2 - gzW, yearY + 58); ctx.globalAlpha = 1;

  // 중앙 하단 제목
  const titleY = CH * 0.70;
  ctx.font = `700 62px ${SERIF}`;
  ctx.fillStyle = INK_V2;
  ctx.fillText(variant.title, (W - ctx.measureText(variant.title).width) / 2, titleY);
  ctx.fillStyle = T.accent;
  ctx.beginPath(); ctx.arc(W / 2, titleY + 28, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.font = `300 24px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText(variant.subtitle, (W - ctx.measureText(variant.subtitle).width) / 2, titleY + 66);
  ctx.font = 'italic 300 18px "Cormorant Garamond", "Noto Serif KR", serif';
  const en = 'Where Eastern Wisdom Meets Western Stars';
  ctx.fillText(en, (W - ctx.measureText(en).width) / 2, titleY + 100);

  // 이름
  const nameY = CH * 0.86;
  ctx.font = `300 14px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText('姓名', W / 2 - 200, nameY - 18);
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(W / 2 - 200, nameY); ctx.lineTo(W / 2 + 200, nameY); ctx.stroke();
  ctx.globalAlpha = 1;
  if (opts.name && opts.name !== '나의 플래너') {
    ctx.font = `400 26px ${SERIF}`;
    ctx.fillStyle = INK_V2;
    ctx.fillText(opts.name, (W - ctx.measureText(opts.name).width) / 2, nameY - 6);
  }

  // 사주 4주 배지 — opts.saju 있으면 이름 아래 가로 한 줄
  if (opts.saju) {
    const s = opts.saju;
    const pillars = [
      { label: '年', v: s.yearPillar },
      { label: '月', v: s.monthPillar },
      { label: '日', v: s.dayPillar },
      { label: '時', v: s.hourPillar },
    ];
    const sajuY = nameY + 36;
    const pW = 90, gap = 12;
    const totalW = pillars.length * pW + (pillars.length - 1) * gap;
    const startX = (W - totalW) / 2;
    pillars.forEach((p, i) => {
      const px = startX + i * (pW + gap);
      // 배경 박스
      ctx.strokeStyle = T.accent; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.8;
      ctx.strokeRect(px, sajuY, pW, 46);
      ctx.globalAlpha = 1;
      // 라벨 (年/月/日/時)
      ctx.font = `300 10px ${SERIF}`;
      ctx.fillStyle = INK_FAINT_V2;
      ctx.fillText(p.label, px + 6, sajuY + 14);
      // 간지
      ctx.font = `400 22px ${SERIF}`;
      ctx.fillStyle = INK_V2;
      const vw = ctx.measureText(p.v).width;
      ctx.fillText(p.v, px + (pW - vw) / 2, sajuY + 36);
    });
    // 하단 요약
    ctx.font = `300 12px ${SERIF}`;
    ctx.fillStyle = INK_FAINT_V2;
    const summary = `일간 ${s.dayElem} · 용신 ${s.yongsin}`;
    ctx.fillText(summary, (W - ctx.measureText(summary).width) / 2, sajuY + 66);
  }

  // 낙관
  const sealSize = 92;
  const sealX = W - PAD_V2 - sealSize;
  const sealY = CH - PAD_V2 - sealSize - 32;
  ctx.fillStyle = SEAL_V2; ctx.globalAlpha = 0.92;
  ctx.fillRect(sealX, sealY, sealSize, sealSize); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
  ctx.strokeRect(sealX + 5, sealY + 5, sealSize - 10, sealSize - 10);
  ctx.font = `900 58px ${SERIF}`;
  ctx.fillStyle = '#fff8f0';
  ctx.fillText(T.kanji, sealX + (sealSize - ctx.measureText(T.kanji).width) / 2, sealY + sealSize - 20);

  drawFooterV2(ctx, W, CH, '— COVER —');
  drawNavBar(ctx, W, H, 'cover', opts.pages);
}

// ════════════════════════════════════════════════════════════════════════════
//  2. YEAR INDEX
// ════════════════════════════════════════════════════════════════════════════

export function drawYearIndex(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
): NavLink[] {
  const T = themeHolder.T;
  const CH = getCH(H);
  const links: NavLink[] = [];

  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // 타이틀: 좌측 큰 연도
  ctx.font = '900 128px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  ctx.fillText(String(opts.year), PAD_V2, PAD_V2 + 144);

  // 우측 간지 + 라벨
  ctx.font = `400 22px ${SERIF}`;
  ctx.fillStyle = INK_V2; ctx.globalAlpha = 0.78;
  const gz = yearGanzhi(opts.year) + '年';
  const gzW = ctx.measureText(gz).width;
  ctx.fillText(gz, W - PAD_V2 - gzW, PAD_V2 + 68); ctx.globalAlpha = 1;
  ctx.font = `300 14px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  const sub = 'ANNUAL · 연간 일력';
  ctx.fillText(sub, W - PAD_V2 - ctx.measureText(sub).width, PAD_V2 + 94);

  drawTitleDividerV2(ctx, W);

  // 12개월 3×4 그리드
  const gridTop = titleDividerY() + 24;
  const gridBot = CH - PAD_V2 - 40;
  const gridW = W - PAD_V2 * 2;
  const cellW = gridW / 3;
  const cellH = (gridBot - gridTop) / 4;

  for (let m = 1; m <= 12; m++) {
    const idx = m - 1;
    const col = idx % 3, row = Math.floor(idx / 3);
    const cx = PAD_V2 + col * cellW;
    const cy = gridTop + row * cellH;
    drawYearMonthCell(ctx, cx, cy, cellW - 18, cellH - 18, m, opts.year);
    // 월 클릭 영역 → 월간 페이지로
    links.push({
      x: cx, y: cy, w: cellW, h: cellH,
      targetType: 'monthly', targetIdx: idx,
    });
  }

  drawFooterV2(ctx, W, CH, '— YEAR INDEX —');
  drawNavBar(ctx, W, H, 'year-index', opts.pages);

  return links;
}

function drawYearMonthCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  m: number, year: number,
) {
  const T = themeHolder.T;
  const idx = m - 1;
  // 월 번호
  ctx.font = '700 46px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  ctx.fillText(String(m).padStart(2, '0'), x, y + 38);
  // 영문
  ctx.save();
  ctx.font = '300 13px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = INK_FAINT_V2; setLS(ctx, '3px');
  ctx.fillText(MONTHS_EN[idx], x + 74, y + 22);
  ctx.restore();
  // 월 간지
  ctx.font = `400 14px ${SERIF}`;
  ctx.fillStyle = INK_V2; ctx.globalAlpha = 0.72;
  ctx.fillText(monthGanzhi(year, m) + '月', x + 74, y + 42);
  ctx.globalAlpha = 1;
  // 구분선
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x, y + 54); ctx.lineTo(x + w, y + 54); ctx.stroke();
  ctx.globalAlpha = 1;
  // 요일 헤더
  const dayY = y + 72;
  const colW = w / 7;
  ctx.save();
  ctx.font = '400 10px "Playfair Display", "Noto Serif KR", serif'; setLS(ctx, '1px');
  for (let d = 0; d < 7; d++) {
    const cx = x + colW * d + colW / 2 - ctx.measureText(DAYS_SHORT[d]).width / 2;
    ctx.fillStyle = d === 0 ? T.accent : INK_FAINT_V2;
    ctx.fillText(DAYS_SHORT[d], cx, dayY);
  }
  ctx.restore();
  // 날짜
  const startW = firstDayOf(year, idx);
  const days = daysInMonth(year, idx);
  const rowH = 22;
  for (let d = 1; d <= days; d++) {
    const slot = startW + d - 1;
    const c = slot % 7, row = Math.floor(slot / 7);
    const cx = x + colW * c + colW / 2, cy = dayY + 18 + row * rowH;
    const isSun = c === 0, isSat = c === 6;
    ctx.font = '400 11.5px "Playfair Display", "Noto Serif KR", serif';
    ctx.fillStyle = isSun ? T.accent : (isSat ? INK_FAINT_V2 : INK_V2);
    ctx.globalAlpha = isSat ? 0.85 : 1;
    const t = String(d);
    ctx.fillText(t, cx - ctx.measureText(t).width / 2, cy);
    ctx.globalAlpha = 1;
    if (getSolarTerm(year, m, d)) {
      ctx.fillStyle = SEAL_V2;
      ctx.beginPath(); ctx.arc(cx + 10, cy - 10, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  3. MONTHLY
// ════════════════════════════════════════════════════════════════════════════

export function drawMonthly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  monthIdx: number, // 0-11
): NavLink[] {
  const T = themeHolder.T;
  const CH = getCH(H);
  const links: NavLink[] = [];
  const year = opts.year;
  const month = monthIdx + 1;

  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // 좌측 큰 월
  ctx.font = '900 180px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  const mNum = String(month).padStart(2, '0');
  ctx.fillText(mNum, PAD_V2, PAD_V2 + 186);
  const mNumW = ctx.measureText(mNum).width;

  // 월 옆 정보
  ctx.save();
  ctx.font = '300 20px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = INK_V2; setLS(ctx, '4px');
  ctx.fillText(MONTHS_EN[monthIdx], PAD_V2 + mNumW + 24, PAD_V2 + 72);
  ctx.restore();
  ctx.font = `400 32px ${SERIF}`;
  ctx.fillStyle = INK_V2;
  ctx.fillText(monthGanzhi(year, month) + '月', PAD_V2 + mNumW + 24, PAD_V2 + 118);
  ctx.font = `300 16px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText(`${year}년 · ${MONTH_THEMES[month].theme}`, PAD_V2 + mNumW + 24, PAD_V2 + 154);

  // 우측 키워드
  ctx.font = `300 14px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  const kw = MONTH_THEMES[month].kw.join(' · ');
  ctx.fillText(kw, W - PAD_V2 - ctx.measureText(kw).width, PAD_V2 + 68);

  drawTitleDividerV2(ctx, W);

  // 달력 + 사이드바
  const SIDE_W = 260, GAP = 28;
  const CAL_W = W - PAD_V2 * 2 - SIDE_W - GAP;
  const CAL_Y = titleDividerY() + 24;
  const CAL_H = CH - PAD_V2 - 40 - CAL_Y;
  const weekLinks = drawMonthCalendar(ctx, PAD_V2, CAL_Y, CAL_W, CAL_H, year, month);
  links.push(...weekLinks);
  drawMonthSidebar(ctx, PAD_V2 + CAL_W + GAP, CAL_Y, SIDE_W, CAL_H, year, month, opts.mode);

  drawFooterV2(ctx, W, CH, `— ${mNum} · MONTHLY —`);
  drawNavBar(ctx, W, H, 'monthly', opts.pages);

  return links;
}

function drawMonthCalendar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  year: number, month: number,
): NavLink[] {
  const T = themeHolder.T;
  const links: NavLink[] = [];
  const days = daysInMonth(year, month - 1);
  const start = firstDayOf(year, month - 1);
  const rows = Math.ceil((start + days) / 7);
  const colW = w / 7;
  const headerH = 32;
  const rowH = (h - headerH) / rows;

  // 요일 헤더
  ctx.save();
  ctx.font = '400 12px "Playfair Display", "Noto Serif KR", serif'; setLS(ctx, '2px');
  for (let d = 0; d < 7; d++) {
    const cx = x + colW * d + colW / 2 - ctx.measureText(DAYS_EN[d]).width / 2;
    ctx.fillStyle = d === 0 ? T.accent : INK_FAINT_V2;
    ctx.fillText(DAYS_EN[d], cx, y + 18);
  }
  ctx.restore();
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.3; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x, y + headerH); ctx.lineTo(x + w, y + headerH); ctx.stroke();
  ctx.globalAlpha = 1;

  // 날짜 셀
  for (let d = 1; d <= days; d++) {
    const slot = start + d - 1;
    const col = slot % 7, row = Math.floor(slot / 7);
    const cx = x + colW * col, cy = y + headerH + row * rowH;
    drawMonthDayCell(ctx, cx, cy, colW, rowH, year, month, d, col);
  }

  // 주 클릭 영역 — 행 단위로 1개씩 생성
  for (let r = 0; r < rows; r++) {
    const isoWeek = representativeIsoWeek(year, month, start, days, r);
    if (isoWeek !== null && isoWeek >= 1 && isoWeek <= 53) {
      links.push({
        x: x, y: y + headerH + r * rowH, w: w, h: rowH,
        targetType: 'weekly', targetIdx: isoWeek,
      });
    }
  }

  // 그리드
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.5;
  for (let c = 1; c < 7; c++) {
    ctx.beginPath();
    ctx.moveTo(x + colW * c, y + headerH);
    ctx.lineTo(x + colW * c, y + headerH + rows * rowH);
    ctx.stroke();
  }
  for (let r = 1; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + headerH + rowH * r);
    ctx.lineTo(x + w, y + headerH + rowH * r);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  return links;
}

function drawMonthDayCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  year: number, month: number, day: number, col: number,
) {
  const T = themeHolder.T;
  const holiday = getHoliday(year, month, day);
  const jeolgi = getSolarTerm(year, month, day);
  const isSun = col === 0, isSat = col === 6;
  const isHoliday = !!holiday;
  if (isHoliday || isSun) {
    ctx.fillStyle = T.accent; ctx.globalAlpha = 0.04;
    ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  }
  ctx.font = '400 22px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = (isSun || isHoliday) ? T.accent : (isSat ? INK_FAINT_V2 : INK_V2);
  ctx.fillText(String(day), x + 10, y + 28);
  if (holiday) {
    ctx.font = '400 9.5px "Noto Sans KR", sans-serif';
    ctx.fillStyle = T.accent;
    ctx.fillText(holiday.name, x + 38, y + 24);
  } else if (jeolgi) {
    ctx.font = '400 9.5px "Noto Sans KR", sans-serif';
    ctx.fillStyle = SEAL_V2;
    ctx.fillText('· ' + jeolgi.name, x + 38, y + 24);
  }
}

function drawMonthSidebar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  year: number, month: number,
  mode: PlannerOptions['mode'] = 'fortune',
) {
  // 좌측 얇은 경계
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x - 14, y); ctx.lineTo(x - 14, y + h); ctx.stroke();
  ctx.globalAlpha = 1;

  if (mode === 'practice') {
    drawMonthSidebarPractice(ctx, x, y, w, h);
  } else {
    drawMonthSidebarFortune(ctx, x, y, w, h, year, month);
  }
}

function drawMonthSidebarFortune(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  year: number, month: number,
) {
  let cy = y;
  cy = drawSectionHeadV2(ctx, x, cy, w, '01', 'INTENTION', '이번 달 의도');
  cy = drawMemoLinesV2(ctx, x, cy, w, 3, 'dot');
  cy += 16;

  cy = drawSectionHeadV2(ctx, x, cy, w, '02', 'QI-FLOW', '월간 기운');
  ctx.font = `400 15px ${SERIF}`;
  ctx.fillStyle = INK_V2;
  ctx.fillText(`간지 · ${monthGanzhi(year, month)}月`, x, cy + 20);
  ctx.font = `300 13px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText(`테마 · ${MONTH_THEMES[month].theme}`, x, cy + 44);
  ctx.fillText(`키워드 · ${MONTH_THEMES[month].kw.join(' / ')}`, x, cy + 66);
  cy += 96;

  cy = drawSectionHeadV2(ctx, x, cy, w, '03', 'SOLAR TERMS', '주요 절기');
  let jy = cy + 16, found = 0;
  for (let d = 1; d <= 31 && found < 3; d++) {
    const jg = getSolarTerm(year, month, d);
    if (jg) {
      ctx.fillStyle = SEAL_V2;
      ctx.beginPath(); ctx.arc(x, jy - 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.font = `400 13px ${SERIF}`;
      ctx.fillStyle = INK_V2;
      ctx.fillText(`${String(d).padStart(2, '0')}일`, x + 12, jy);
      ctx.fillStyle = INK_FAINT_V2;
      ctx.fillText(jg.name, x + 60, jy);
      jy += 22; found++;
    }
  }
  if (found === 0) {
    ctx.fillStyle = INK_FAINT_V2;
    ctx.font = `300 12px ${SERIF}`;
    ctx.fillText('이번 달 주요 절기 없음', x, jy);
  }
  cy += 96;

  cy = drawSectionHeadV2(ctx, x, cy, w, '04', 'REFLECTION', '한 달 회고');
  const remain = (y + h) - cy - 8;
  const refLines = Math.max(3, Math.min(6, Math.floor(remain / LH)));
  drawMemoLinesV2(ctx, x, cy, w, refLines, 'dot');
}

function drawMonthSidebarPractice(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  let cy = y;
  // 01 OKR — 월 핵심 목표
  cy = drawSectionHeadV2(ctx, x, cy, w, '01', 'OKR', '월 목표 · 핵심결과');
  ctx.font = `300 12px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText('Objective', x, cy + 16);
  cy = drawMemoLinesV2(ctx, x, cy + 4, w, 2, 'dot');
  ctx.font = `300 12px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText('Key Results', x, cy + 8);
  cy = drawMemoLinesV2(ctx, x, cy, w, 3, 'dot');
  cy += 12;

  // 02 HABITS — 5가지 핵심 습관 트래커
  cy = drawSectionHeadV2(ctx, x, cy, w, '02', 'HABITS', '5가지 핵심 습관');
  const habits = ['운동', '독서', '명상', '수분', '일기'];
  habits.forEach((habit, i) => {
    const hy = cy + 16 + i * 24;
    // 체크박스 5개 (주 5회 목표)
    for (let d = 0; d < 5; d++) {
      ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.35; ctx.lineWidth = 0.6;
      ctx.strokeRect(x + 90 + d * 22, hy - 10, 14, 14);
      ctx.globalAlpha = 1;
    }
    ctx.font = `400 13px ${SERIF}`;
    ctx.fillStyle = INK_V2;
    ctx.fillText(habit, x, hy);
  });
  cy += 16 + habits.length * 24 + 12;

  // 03 WEEKLY FOCUS — 주차별 포커스
  cy = drawSectionHeadV2(ctx, x, cy, w, '03', 'FOCUS', '주차별 포커스');
  for (let wk = 1; wk <= 4; wk++) {
    const fy = cy + 12 + (wk - 1) * LH;
    ctx.font = `300 11px "Playfair Display", "Noto Serif KR", serif`;
    ctx.fillStyle = INK_FAINT_V2;
    ctx.fillText(`W${wk}`, x, fy);
    ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.3; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(x + 24, fy); ctx.lineTo(x + w, fy); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  cy += 12 + 4 * LH + 12;

  // 04 REVIEW — 월말 회고 (잘한 점 / 개선점)
  cy = drawSectionHeadV2(ctx, x, cy, w, '04', 'REVIEW', '잘한 점 · 개선점');
  const remain = (y + h) - cy - 8;
  const refLines = Math.max(2, Math.min(5, Math.floor(remain / LH)));
  drawMemoLinesV2(ctx, x, cy, w, refLines, 'dot');
}

// ════════════════════════════════════════════════════════════════════════════
//  4. WEEKLY
// ════════════════════════════════════════════════════════════════════════════

export function drawWeekly(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  weekNo: number,
) {
  const T = themeHolder.T;
  const CH = getCH(H);
  const weekDates = getWeekDates(opts.year, weekNo); // 월~일
  const start = weekDates[0];
  const end = weekDates[6];

  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // WEEK 라벨
  ctx.save();
  ctx.font = '300 22px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = INK_FAINT_V2; setLS(ctx, '6px');
  ctx.fillText('WEEK', PAD_V2, PAD_V2 + 60);
  ctx.restore();
  // 큰 주차 번호
  ctx.font = '900 112px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  const wkStr = String(weekNo).padStart(2, '0');
  ctx.fillText(wkStr, PAD_V2, PAD_V2 + 162);

  // 우측 기간
  const range = `${start.getMonth() + 1}.${String(start.getDate()).padStart(2, '0')}  —  ${end.getMonth() + 1}.${String(end.getDate()).padStart(2, '0')}`;
  ctx.font = '400 28px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = INK_V2;
  ctx.fillText(range, W - PAD_V2 - ctx.measureText(range).width, PAD_V2 + 80);
  ctx.font = `300 14px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  const ms = `${opts.year}년 · 第${weekNo}週`;
  ctx.fillText(ms, W - PAD_V2 - ctx.measureText(ms).width, PAD_V2 + 108);
  ctx.font = 'italic 300 16px "Cormorant Garamond", "Noto Serif KR", serif';
  ctx.fillStyle = INK_FAINT_V2;
  const q = '"The rhythm of the week is the rhythm of a life."';
  ctx.fillText(q, W - PAD_V2 - ctx.measureText(q).width, PAD_V2 + 140);

  drawTitleDividerV2(ctx, W);

  // 7일 행
  const FOOT_H = 260;
  const DAYS_TOP = titleDividerY() + 24;
  const DAYS_BOT = CH - PAD_V2 - FOOT_H;
  const DAY_H = (DAYS_BOT - DAYS_TOP) / 7;
  // ISO 주 자연 순서 (월→일) 유지 — 업무용 주간 플래너에 가장 자연스러움
  for (let i = 0; i < 7; i++) {
    drawWeekDayRow(ctx, PAD_V2, DAYS_TOP + i * DAY_H, W - PAD_V2 * 2, DAY_H, weekDates[i]);
  }
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(PAD_V2, DAYS_BOT); ctx.lineTo(W - PAD_V2, DAYS_BOT); ctx.stroke();
  ctx.globalAlpha = 1;

  // 하단 3블록 — 모드에 따라 라벨 변경
  const BOT_Y = DAYS_BOT + 20;
  drawWeekFooter(ctx, PAD_V2, BOT_Y, W - PAD_V2 * 2, FOOT_H - 60, opts.mode);

  drawFooterV2(ctx, W, CH, `— WK ${wkStr} · WEEKLY —`);
  drawNavBar(ctx, W, H, 'weekly', opts.pages);
}

function drawWeekDayRow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  d: Date,
) {
  const T = themeHolder.T;
  const dow = d.getDay();
  const isSun = dow === 0;
  const isSat = dow === 6;
  // 상단 구분선
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.15; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.globalAlpha = 1;
  // 주말 배경
  if (isSun) {
    ctx.fillStyle = T.accent; ctx.globalAlpha = 0.035;
    ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  } else if (isSat) {
    ctx.fillStyle = INK_V2; ctx.globalAlpha = 0.02;
    ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
  }
  const LEFT_W = 180;
  // 큰 일자
  ctx.font = '300 64px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = isSun ? T.accent : INK_V2;
  ctx.fillText(String(d.getDate()).padStart(2, '0'), x + 10, y + 58);
  // 요일 영문
  ctx.save();
  ctx.font = '400 13px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = isSun ? T.accent : INK_FAINT_V2; setLS(ctx, '3px');
  ctx.fillText(DAYS_EN[dow], x + 92, y + 30);
  ctx.restore();
  // 요일 한자
  ctx.font = `400 20px ${SERIF}`;
  ctx.fillStyle = isSun ? T.accent : INK_V2;
  ctx.fillText(DAYS_KANJI[dow] + '曜', x + 92, y + 58);
  // 일진
  ctx.font = `300 13px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  const gz = dayGanzhi(d.getFullYear(), d.getMonth() + 1, d.getDate());
  ctx.fillText('일진 · ' + gz + '日', x + 10, y + 88);
  // 공휴일
  const holiday = getHoliday(d.getFullYear(), d.getMonth() + 1, d.getDate());
  if (holiday) {
    ctx.font = '400 11px "Noto Sans KR", sans-serif';
    ctx.fillStyle = T.accent;
    ctx.fillText(holiday.name, x + 10, y + 108);
  }
  // 중앙 세로선
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.2; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + LEFT_W, y + 8); ctx.lineTo(x + LEFT_W, y + h - 8); ctx.stroke();
  ctx.globalAlpha = 1;
  // 우측 메모 5줄 (LH 고정)
  drawMemoLinesV2(ctx, x + LEFT_W + 20, y + 8, w - LEFT_W - 40, 5, 'dot');
}

function drawWeekFooter(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  mode: PlannerOptions['mode'] = 'fortune',
) {
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.globalAlpha = 1;
  const colW = w / 3, GAP = 20;
  if (mode === 'practice') {
    drawWeekFooterBlock(ctx, x,            y + 16, colW - GAP, '01', 'MIT 3',      '이번 주 가장 중요한 3가지', 3);
    drawWeekFooterBlock(ctx, x + colW,     y + 16, colW - GAP, '02', 'HABITS',     '주간 습관 체크',        5);
    drawWeekFooterBlock(ctx, x + colW * 2, y + 16, colW - GAP, '03', 'REVIEW',     '잘한 점 · 개선점',        4);
  } else {
    drawWeekFooterBlock(ctx, x,            y + 16, colW - GAP, '01', 'TOP 3',      '이번 주 핵심', 3);
    drawWeekFooterBlock(ctx, x + colW,     y + 16, colW - GAP, '02', 'GRATITUDE',  '감사한 것',   3);
    drawWeekFooterBlock(ctx, x + colW * 2, y + 16, colW - GAP, '03', 'REFLECTION', '한 주 회고',  4);
  }
}
function drawWeekFooterBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  num: string, en: string, ko: string, lines: number,
) {
  const contentY = drawSectionHeadV2(ctx, x, y, w, num, en, ko);
  drawMemoLinesV2(ctx, x, contentY, w, lines, 'dot');
}

// ════════════════════════════════════════════════════════════════════════════
//  5. DAILY
// ════════════════════════════════════════════════════════════════════════════

export function drawDaily(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
  dayOfYear = 0,  // 0 = Jan 1, ..., 364/365 = Dec 31
) {
  const T = themeHolder.T;
  const CH = getCH(H);
  // 365일 풀 모드 or 샘플 모드 모두 dayOfYear로 특정 날짜 렌더
  const d = new Date(opts.year, 0, 1 + dayOfYear);
  const dow = d.getDay();
  const gz = dayGanzhi(d.getFullYear(), d.getMonth() + 1, d.getDate());

  drawPaperV2(ctx, W, CH);
  drawHeaderV2(ctx, W);

  // 좌측 거대 일자
  ctx.font = '900 200px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = T.accent;
  const dayStr = String(d.getDate()).padStart(2, '0');
  ctx.fillText(dayStr, PAD_V2, PAD_V2 + 206);
  const dayW = ctx.measureText(dayStr).width;
  const x2 = PAD_V2 + dayW + 32;

  // 옆: 년·월
  ctx.save();
  ctx.font = '300 22px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = INK_FAINT_V2; setLS(ctx, '3px');
  ctx.fillText(`${d.getFullYear()} · ${String(d.getMonth() + 1).padStart(2, '0')}`, x2, PAD_V2 + 70);
  ctx.restore();
  ctx.font = `600 54px ${SERIF}`;
  ctx.fillStyle = INK_V2;
  ctx.fillText(DAYS_KO_SHORT[dow] + '요일', x2, PAD_V2 + 132);
  ctx.font = `400 20px ${SERIF}`;
  ctx.fillStyle = INK_FAINT_V2;
  ctx.fillText(`${DAYS_KANJI[dow]}曜日 · ${DAYS_EN_FULL[dow]}`, x2, PAD_V2 + 162);

  // 우측 박스 — 운세 모드: DAY QI / 실천 모드: DAILY FOCUS
  const boxW = 280, boxH = 168;
  const boxX = W - PAD_V2 - boxW;
  const boxY = PAD_V2 + 38;
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.9;
  ctx.strokeRect(boxX, boxY, boxW, boxH); ctx.globalAlpha = 1;
  ctx.fillStyle = T.accent;
  ctx.fillRect(boxX, boxY, boxW, 28);
  ctx.save();
  ctx.font = '400 12px "Playfair Display", "Noto Serif KR", serif';
  ctx.fillStyle = '#faf6ee'; setLS(ctx, '3px');
  if (opts.mode === 'practice') {
    ctx.fillText('DAILY FOCUS · 오늘의 초점', boxX + 14, boxY + 18);
  } else {
    ctx.fillText('DAY QI · 오늘의 기운', boxX + 14, boxY + 18);
  }
  ctx.restore();
  if (opts.mode === 'practice') {
    // 실천: 오늘의 MIT 3가지 프리뷰 (체크박스 3개)
    ctx.font = '400 14px "Noto Serif KR", serif';
    ctx.fillStyle = INK_V2;
    ctx.fillText('오늘의 MIT 3', boxX + 18, boxY + 60);
    for (let i = 0; i < 3; i++) {
      const my = boxY + 86 + i * 24;
      ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.45; ctx.lineWidth = 0.8;
      ctx.strokeRect(boxX + 18, my - 10, 12, 12);
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.moveTo(boxX + 38, my); ctx.lineTo(boxX + boxW - 18, my); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.font = `400 64px ${SERIF}`;
    ctx.fillStyle = INK_V2;
    ctx.fillText(gz, boxX + 18, boxY + 104);
    ctx.font = `300 16px ${SERIF}`;
    ctx.fillStyle = INK_FAINT_V2;
    ctx.fillText('日', boxX + 18 + ctx.measureText(gz).width + 8, boxY + 104);
    ctx.font = `300 13px ${SERIF}`;
    ctx.fillStyle = INK_V2;
    const stemIdx = STEMS.indexOf(gz[0]);
    const elem = ['木','木','火','火','土','土','金','金','水','水'][stemIdx] ?? '木';
    ctx.fillText('오행 · ' + elem, boxX + 18, boxY + 136);
    ctx.fillStyle = SEAL_V2;
    ctx.fillText('기운 · 전진', boxX + 150, boxY + 136);
  }

  drawTitleDividerV2(ctx, W);

  // 중단: 12시진 + 메모
  const BOT_H = 340;
  const MID_Y = titleDividerY() + 24;
  const MID_BOT = CH - PAD_V2 - BOT_H;
  const MID_H = MID_BOT - MID_Y;
  const SHI_W = 420;
  if (opts.mode === 'practice') {
    drawPracticeTimeBlocks(ctx, PAD_V2, MID_Y, SHI_W, MID_H);
  } else {
    drawShichen(ctx, PAD_V2, MID_Y, SHI_W, MID_H);
  }
  const MEMO_X = PAD_V2 + SHI_W + 24;
  const MEMO_W = W - PAD_V2 - MEMO_X;
  const memoContentY = drawSectionHeadV2(ctx, MEMO_X, MID_Y, MEMO_W, '02', 'TASKS & NOTES', '할 일 · 메모');
  const memoLines = Math.min(16, Math.floor((MID_H - SECTION_HEAD_H) / LH));
  drawMemoLinesV2(ctx, MEMO_X, memoContentY, MEMO_W, memoLines, 'check');

  // 하단 3블록
  const BOT_Y = MID_BOT;
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(PAD_V2, BOT_Y); ctx.lineTo(W - PAD_V2, BOT_Y); ctx.stroke();
  ctx.globalAlpha = 1;
  const colW = (W - PAD_V2 * 2) / 3, GAP = 20;
  if (opts.mode === 'practice') {
    drawDailyBottomBlock(ctx, PAD_V2,             BOT_Y + 16, colW - GAP, '03', 'MIT 3',       '오늘 MIT',     3);
    drawDailyBottomBlock(ctx, PAD_V2 + colW,      BOT_Y + 16, colW - GAP, '04', 'HABITS',      '오늘 습관 체크', 5);
    drawDailyBottomBlock(ctx, PAD_V2 + colW * 2,  BOT_Y + 16, colW - GAP, '05', 'TOMORROW',    '내일 준비',    3);
  } else {
    drawDailyBottomBlock(ctx, PAD_V2,             BOT_Y + 16, colW - GAP, '03', 'TOP 3',       '오늘 핵심',    3);
    drawDailyBottomBlock(ctx, PAD_V2 + colW,      BOT_Y + 16, colW - GAP, '04', 'GRATITUDE',   '감사',        3);
    drawDailyBottomBlock(ctx, PAD_V2 + colW * 2,  BOT_Y + 16, colW - GAP, '05', 'TOMORROW',    '내일 의도',    3);
  }

  drawFooterV2(ctx, W, CH, `— ${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${dayStr} · DAILY —`);
  drawNavBar(ctx, W, H, 'daily', opts.pages);
}
function drawDailyBottomBlock(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  num: string, en: string, ko: string, lines: number,
) {
  const contentY = drawSectionHeadV2(ctx, x, y, w, num, en, ko);
  drawMemoLinesV2(ctx, x, contentY, w, lines, 'dot');
}
/** 실천 모드 일간 좌측 — 1시간 단위 시간 블록 (06:00~22:00) */
function drawPracticeTimeBlocks(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  const contentY = drawSectionHeadV2(ctx, x, y, w, '01', 'TIME BLOCKS', '시간 블록');
  const startHour = 6;
  const blocks = 17; // 06:00 ~ 22:00
  const rowH = (h - SECTION_HEAD_H) / blocks;
  for (let i = 0; i < blocks; i++) {
    const ry = contentY + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const hour = startHour + i;
    ctx.font = '400 18px "Playfair Display", "Noto Serif KR", serif';
    ctx.fillStyle = INK_V2;
    ctx.fillText(`${String(hour).padStart(2, '0')}:00`, x + 6, ry + rowH * 0.68);
    // 메모 라인
    ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.25; ctx.lineWidth = 0.55;
    ctx.beginPath();
    ctx.moveTo(x + 80, ry + rowH * 0.72);
    ctx.lineTo(x + w - 6, ry + rowH * 0.72);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.2; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x + 72, contentY); ctx.lineTo(x + 72, contentY + blocks * rowH); ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawShichen(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  const T = themeHolder.T;
  const contentY = drawSectionHeadV2(ctx, x, y, w, '01', 'SHICHEN', '십이시진');
  const rowH = (h - SECTION_HEAD_H) / 12;
  SHICHEN.forEach((s, i) => {
    const ry = contentY + i * rowH;
    if (i > 0) {
      ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.12; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + w, ry); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillStyle = T.accent;
    ctx.fillText(s.kanji, x + 6, ry + rowH * 0.68);
    ctx.font = `400 12px ${SERIF}`;
    ctx.fillStyle = INK_V2;
    ctx.fillText(s.name, x + 42, ry + rowH * 0.48);
    ctx.font = '300 11px "Playfair Display", "Noto Serif KR", serif';
    ctx.fillStyle = INK_FAINT_V2;
    ctx.fillText(s.range, x + 42, ry + rowH * 0.78);
    ctx.font = `300 14px ${SERIF}`;
    ctx.fillStyle = INK_FAINT_V2; ctx.globalAlpha = 0.45;
    ctx.fillText(s.glyph, x + 148, ry + rowH * 0.68);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.28; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(x + 180, ry + rowH * 0.72); ctx.lineTo(x + w - 6, ry + rowH * 0.72); ctx.stroke();
    ctx.globalAlpha = 1;
  });
  ctx.strokeStyle = INK_V2; ctx.globalAlpha = 0.2; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x + 172, contentY); ctx.lineTo(x + 172, contentY + 12 * rowH); ctx.stroke();
  ctx.globalAlpha = 1;
}
