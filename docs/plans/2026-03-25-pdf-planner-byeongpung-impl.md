# PDF 플래너 병풍 스타일 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** PDF 플래너 내부 디자인을 "고요한 병풍" 컨셉(한지 호백 배경 + 각 테마 악센트)으로 전환

**Architecture:** 점진적 접근 — 기존 T/C 분리 아키텍처 유지. (1) C 상수 교체 → (2) 7개 테마 리마스터 → (3) drawCover 서예 커버로 재작성 → (4) NavBar 골드 하드코딩 제거 → (5) 빌드+시각 검증

**Tech Stack:** TypeScript, Canvas 2D API, jsPDF, Next.js 15

---

## Task 1: C 상수 교체 (고정 팔레트 → 한지/먹물 중성계열)

**Files:**
- Modify: `src/lib/pdf-generator.ts:53-80`

**Step 1: C 상수 블록 교체**

`src/lib/pdf-generator.ts` 53~80줄의 `const C` 블록을 아래로 교체:

```typescript
const C = {
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
```

**Step 2: 변경 의도 확인**
- `bgPage`: 페이지 전체 배경 → 한지 화이트 (#faf9f7)
- `textDark/Mid/Light`: 먹물 계열 → 핑크 편향 제거
- `ruleColor`: 규칙선 → 한지 베이지 경계
- `gold/goldPale/goldFaint/goldDim`: 골드 대신 한국 빨강/회색 — 커버에서만 사용

**Step 3: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "feat: PDF 플래너 고정 팔레트 C 상수 한지/먹물 계열로 교체"
```

---

## Task 2: 7개 테마 병풍 스타일 리마스터

**Files:**
- Modify: `src/lib/pdf-themes.ts:52-158`

**Step 1: THEMES 배열 전체 교체**

`src/lib/pdf-themes.ts` 52~158줄 (THEMES 배열)을 아래로 교체:

```typescript
export const THEMES: ColorTheme[] = [
  // ── 🌸 로즈 (핑크작약) ────────────────────────────────────────────────────
  {
    id: 'rose', name: '로즈', emoji: '🌸', swatch: '#c2567a',
    coverDeep: '#6a1a38', coverMid: '#c2567a', coverLight: '#f0d0dc',
    headerA: '#9a3055', headerB: '#c2567a',
    weeklyA: '#9a3055', weeklyB: '#c2567a',
    weeklyAccent: 'rgba(255,230,240,0.90)',
    dayBgSun: '#fce8f0', dayBgSat: '#f4e8f8', dayBgMid: '#fdf8fc',
    wkDayBgSun: '#fce8f0', wkDayBgSat: '#ede0f4', wkDayBgMid: '#f8f0fb',
    wkDayAccent: '#9a3055',
    cellBgSun: '#fff5f8', cellBgSat: '#f9f0fc',
    sundayText: '#b84060', saturdayText: '#9a3055',
    todayCircle: '#c2567a',
    navA: '#9a3055', navB: '#6a1a38',
  },
  // ── ⚓ 네이비 (인디고) ────────────────────────────────────────────────────
  {
    id: 'navy', name: '네이비', emoji: '⚓', swatch: '#1a2a6c',
    coverDeep: '#0f1a4a', coverMid: '#1a2a6c', coverLight: '#c8d0e8',
    headerA: '#1a2a6c', headerB: '#2a3a8c',
    weeklyA: '#1a2a6c', weeklyB: '#2a3a8c',
    weeklyAccent: 'rgba(200,220,255,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#e0e8f8', dayBgMid: '#f0f4fc',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#d4e0f4', wkDayBgMid: '#e8eef8',
    wkDayAccent: '#1a2a6c',
    cellBgSun: '#fff0f0', cellBgSat: '#eef2fc',
    sundayText: '#c04040', saturdayText: '#1a2a6c',
    todayCircle: '#1a2a6c',
    navA: '#1a2a6c', navB: '#0f1a4a',
  },
  // ── 🖤 블랙 (먹물) ────────────────────────────────────────────────────────
  {
    id: 'black', name: '블랙', emoji: '🖤', swatch: '#222222',
    coverDeep: '#111111', coverMid: '#333333', coverLight: '#cccccc',
    headerA: '#222222', headerB: '#444444',
    weeklyA: '#222222', weeklyB: '#444444',
    weeklyAccent: 'rgba(220,215,205,0.90)',
    dayBgSun: '#fde8ea', dayBgSat: '#eaeaea', dayBgMid: '#f4f4f4',
    wkDayBgSun: '#fde8ea', wkDayBgSat: '#e0e0e0', wkDayBgMid: '#ececec',
    wkDayAccent: '#333333',
    cellBgSun: '#fff0f0', cellBgSat: '#f4f4f4',
    sundayText: '#c04040', saturdayText: '#444444',
    todayCircle: '#333333',
    navA: '#222222', navB: '#111111',
  },
  // ── 💙 블루 (청화백자) ──────────────────────────────────────────────────
  {
    id: 'blue', name: '블루', emoji: '💙', swatch: '#2a5280',
    coverDeep: '#102040', coverMid: '#2a5280', coverLight: '#c0d0e8',
    headerA: '#1a3a6a', headerB: '#2a5280',
    weeklyA: '#1a3a6a', weeklyB: '#2a5280',
    weeklyAccent: 'rgba(190,220,255,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eeff', dayBgMid: '#eef4ff',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#cce0ff', wkDayBgMid: '#e4f0ff',
    wkDayAccent: '#1a3a6a',
    cellBgSun: '#fff0f0', cellBgSat: '#eef6ff',
    sundayText: '#c04040', saturdayText: '#2a5280',
    todayCircle: '#2a5280',
    navA: '#1a3a6a', navB: '#102040',
  },
  // ── 🌿 포레스트 (청자색) ────────────────────────────────────────────────
  {
    id: 'forest', name: '포레스트', emoji: '🌿', swatch: '#2a6c5a',
    coverDeep: '#143a2a', coverMid: '#2a6c5a', coverLight: '#b8d8cc',
    headerA: '#1e5040', headerB: '#2a6c5a',
    weeklyA: '#1e5040', weeklyB: '#2a6c5a',
    weeklyAccent: 'rgba(190,235,210,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#d8eedc', dayBgMid: '#eef6f0',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#cce4d0', wkDayBgMid: '#e4f0e8',
    wkDayAccent: '#1e5040',
    cellBgSun: '#fff0f0', cellBgSat: '#f0faf2',
    sundayText: '#c04040', saturdayText: '#2a6c5a',
    todayCircle: '#2a6c5a',
    navA: '#1e5040', navB: '#143a2a',
  },
  // ── 🧡 오렌지 (홍살구) ──────────────────────────────────────────────────
  {
    id: 'orange', name: '오렌지', emoji: '🧡', swatch: '#d4622a',
    coverDeep: '#8c3010', coverMid: '#d4622a', coverLight: '#f4d0b8',
    headerA: '#b04020', headerB: '#d4622a',
    weeklyA: '#b04020', weeklyB: '#d4622a',
    weeklyAccent: 'rgba(255,220,180,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#fff0dc', dayBgMid: '#fff8f2',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#ffe4c0', wkDayBgMid: '#fff0e4',
    wkDayAccent: '#b04020',
    cellBgSun: '#fff0f0', cellBgSat: '#fff8ec',
    sundayText: '#c04040', saturdayText: '#b04020',
    todayCircle: '#d4622a',
    navA: '#b04020', navB: '#8c3010',
  },
  // ── ✨ 골드 (한국 금색) ──────────────────────────────────────────────────
  {
    id: 'gold', name: '골드', emoji: '✨', swatch: '#c8972a',
    coverDeep: '#7a5010', coverMid: '#c8972a', coverLight: '#f0e0b0',
    headerA: '#a07020', headerB: '#c8972a',
    weeklyA: '#a07020', weeklyB: '#c8972a',
    weeklyAccent: 'rgba(245,220,150,0.90)',
    dayBgSun: '#fde8e8', dayBgSat: '#f8eecc', dayBgMid: '#fdf8ec',
    wkDayBgSun: '#fde8e8', wkDayBgSat: '#f4e4c0', wkDayBgMid: '#fdf0d8',
    wkDayAccent: '#a07020',
    cellBgSun: '#fff0f0', cellBgSat: '#fdf8ec',
    sundayText: '#c04040', saturdayText: '#a07020',
    todayCircle: '#c8972a',
    navA: '#a07020', navB: '#7a5010',
  },
];
```

**Step 2: Commit**

```bash
git add src/lib/pdf-themes.ts
git commit -m "feat: PDF 플래너 7개 테마 병풍 스타일로 리마스터"
```

---

## Task 3: drawCover() 서예 커버로 재작성

**Files:**
- Modify: `src/lib/pdf-generator.ts:285-444` (drawCover 함수 전체)

**Step 1: drawStars, drawMoon 헬퍼 제거**

167~208줄의 `drawStars()`와 `drawMoon()` 함수는 서예 커버에서 사용하지 않음.
삭제 후 아래 `drawBrushStrokes()` 헬퍼로 대체:

```typescript
// ── 추상 브러시 스트로크 (서예 커버 배경) ─────────────────────────────────
function drawBrushStrokes(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  color: string,
) {
  const strokes: [number, number, number, number, number][] = [
    // [startX%, startY%, endX%, endY%, opacity]
    [0.10, 0.18, 0.55, 0.42, 0.07],
    [0.45, 0.10, 0.90, 0.35, 0.05],
    [0.05, 0.55, 0.50, 0.80, 0.06],
    [0.55, 0.60, 0.95, 0.85, 0.04],
  ];
  const [r, g, b] = hexToRgb(color);
  for (const [sx, sy, ex, ey, op] of strokes) {
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
    ctx.lineWidth = 60 + Math.random() * 40;
    ctx.strokeStyle = grad;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

// ── 계절 픽토그램 (커버 하단) ─────────────────────────────────────────────
function drawSeasonPictos(
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
    // 원형 배경
    ctx.beginPath(); ctx.arc(cx, y, size*0.6, 0, Math.PI*2);
    ctx.fillStyle = `rgba(${r},${g},${b},0.08)`; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, y, size*0.6, 0, Math.PI*2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`; ctx.lineWidth = 1; ctx.stroke();
    draw(cx, y);
  });
}
```

**Step 2: drawCover() 함수 본체 재작성**

285~444줄의 `drawCover` 함수를 아래로 교체:

```typescript
function drawCover(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  opts: PlannerOptions,
) {
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

    // 플래너 이름 (사용자 입력)
    ctx.font = F(32, true, true);
    ctx.fillStyle = C.textDark;
    centeredText(ctx, '나만의 365일 플래너', CH * 0.588, W);

    ctx.font = F(20, false, false);
    ctx.fillStyle = C.textLight;
    centeredText(ctx, `사주로 읽는 ${opts.year}년 운세 일력`, CH * 0.634, W);

    // 하단 구분선
    ctx.beginPath();
    ctx.moveTo(W * 0.25, CH * 0.658);
    ctx.lineTo(W * 0.75, CH * 0.658);
    ctx.strokeStyle = T.coverDeep;
    ctx.globalAlpha = 0.15;
    ctx.lineWidth = 0.8;
    ctx.stroke();
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
    // 좌측 악센트 띠
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
    const tw = ctx.measureText('사주·운세로 설계한 나만의 플래너').width;
    ctx.fillText('사주·운세로 설계한 나만의 플래너', RX+(RW-tw)/2, CH*0.78);

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

    // 가로형 계절 픽토그램
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
```

**Step 3: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "feat: PDF 플래너 커버 서예 병풍 스타일로 재작성 (브러시 스트로크 + 계절 픽토그램)"
```

---

## Task 4: NavBar 골드 하드코딩 제거

**Files:**
- Modify: `src/lib/pdf-generator.ts:241-275`

**Step 1: 골드 하드코딩 → 중립 흰색 반투명으로 교체**

241~247줄:
```typescript
// 변경 전
ctx.strokeStyle = 'rgba(240,192,64,0.25)';

// 변경 후
ctx.strokeStyle = 'rgba(255,255,255,0.15)';
```

258~266줄 (활성 탭 테두리):
```typescript
// 변경 전
ctx.strokeStyle = 'rgba(240,192,64,0.55)';

// 변경 후
ctx.strokeStyle = 'rgba(255,255,255,0.35)';
```

270~274줄 (탭 텍스트 색상):
```typescript
// 변경 전
ctx.fillStyle = isActive
  ? C.gold
  : isAvail
    ? 'rgba(255,215,230,0.85)'
    : 'rgba(200,155,175,0.45)';

// 변경 후
ctx.fillStyle = isActive
  ? '#ffffff'
  : isAvail
    ? 'rgba(255,255,255,0.75)'
    : 'rgba(255,255,255,0.30)';
```

**Step 2: Commit**

```bash
git add src/lib/pdf-generator.ts
git commit -m "fix: NavBar 골드 하드코딩 제거 — 중립 흰색 반투명으로 통일"
```

---

## Task 5: 빌드 검증 + 시각 확인

**Step 1: TypeScript 타입 검사**

```bash
npx tsc --noEmit
```
Expected: 오류 0개

**Step 2: Next.js 빌드**

```bash
npx next build
```
Expected: ✓ Compiled successfully

**Step 3: 개발 서버 실행**

```bash
npx next dev
```

**Step 4: preview_screenshot으로 시각 검증**

확인 항목:
- [ ] 커버: 한지 배경 + 브러시 스트로크 + 계절 픽토그램 4개
- [ ] 커버 연도 텍스트: 테마 색상(T.coverDeep) 적용
- [ ] 월간 페이지: 한지 배경 (#faf9f7) + 먹물 텍스트
- [ ] 규칙선: 핑크 제거 → 한지 베이지 (#e0dbd4)
- [ ] NavBar: 골드 제거 → 흰색 반투명
- [ ] rose 테마: 핑크작약 (#c2567a) 악센트
- [ ] navy 테마: 인디고 (#1a2a6c) 악센트
- [ ] 가로형 커버: 좌측 띠 + 계절 픽토그램

**Step 5: 이상 없으면 최종 커밋**

```bash
git add .
git commit -m "feat: PDF 플래너 병풍 스타일 재설계 완료"
```
