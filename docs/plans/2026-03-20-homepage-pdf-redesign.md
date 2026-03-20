# Homepage UI/UX + PDF 전면 개선 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 홈페이지 UI/UX 묵향 완성도 향상 + PDF 커버·운세·시각 품질 전면 개선 + 홈 미리보기를 실시간 캔버스로 교체

**Architecture:**
- PDF 개선은 `src/lib/pdf-generator.ts`의 draw 함수만 수정 (Canvas 2D API)
- 홈 미리보기는 `PlannerPreviewCanvas` 컴포넌트로 교체 (SSR-safe dynamic import)
- 모든 변경은 TypeScript strict + `npx tsc --noEmit` 통과 필수

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (ft-* 토큰), Canvas 2D API, jsPDF

---

## Task 1: 홈페이지 UI/UX 개선

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx` (Noto Serif KR 폰트 로딩 확인)

### Step 1: 폰트 로딩 확인
`src/app/layout.tsx`를 읽어 `Noto_Serif_KR`이 `next/font/google`으로 로딩되는지 확인.
없으면 추가:
```tsx
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google';
const notoSerif = Noto_Serif_KR({ subsets: ['latin'], weight: ['400','700','900'], variable: '--font-noto-serif' });
```
`<body>` className에 `${notoSerif.variable}` 추가.

### Step 2: Hero 섹션 개선
`src/app/page.tsx` Hero 섹션:
- 메인 헤딩 폰트 크기: `text-4xl sm:text-5xl lg:text-6xl` (현재보다 크게)
- 뱃지 스타일: pill 형태 → 얇은 인디고 테두리 + serif 텍스트
- 서브 텍스트 행간: `leading-loose`
- 히어로 배경에 미묘한 방사형 그라디언트 overlay 추가:
  ```tsx
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#e8e4ff22_0%,_transparent_70%)] pointer-events-none" />
  ```
- Primary CTA 버튼: 더 큰 패딩 `px-10 py-5`, `rounded-2xl`, shadow 강화
- Secondary CTA: `border-2 border-ft-ink/20` + `hover:border-ft-ink/60`

### Step 3: 섹션 간격 통일
모든 `<section>` 패딩을 `py-16` → `py-24`로 통일 (더 여유 있는 여백).

### Step 4: 상품 카드 개선
`ProductCard` 컴포넌트 위치 파악 후:
- 카드 hover 시 미세 상승: `hover:-translate-y-1 transition-transform duration-200`
- 인기 뱃지: 배경 `bg-ft-gold text-ft-ink font-bold` (골드로)
- 가격 표시: 정가 취소선 색상 `text-ft-muted/60`

### Step 5: 커밋
```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "design: 홈페이지 Hero·섹션 여백·카드 UI 개선"
```

---

## Task 2: PDF 커버 리디자인 (타로/점성술 스타일)

**Files:**
- Modify: `src/lib/pdf-generator.ts` — `drawCover()` 함수 (line 273~389)

### Step 1: 커버 배경 개선 (세로형 기준)
현재: 단순 3-stop 선형 그라디언트
개선: 방사형 그라디언트 + 상단 달 영역 글로우 효과

```typescript
// 배경: 방사형 그라디언트로 교체
const radGrad = ctx.createRadialGradient(W/2, CH*0.25, 0, W/2, CH*0.25, CH*0.75);
radGrad.addColorStop(0, T.coverMid);    // 달 주변 밝음
radGrad.addColorStop(0.5, T.coverDeep); // 중간
radGrad.addColorStop(1, '#080610');      // 하단 매우 어둡게
ctx.fillStyle = radGrad;
ctx.fillRect(0, 0, W, CH);
```

### Step 2: 장식 원형 테두리 프레임 추가
커버에 타로카드처럼 얇은 원형 장식 프레임:
```typescript
// 커버 상단 원형 장식
const cx = W/2, cy = CH * 0.22;
const r1 = W * 0.155, r2 = W * 0.163;
ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2);
ctx.strokeStyle = 'rgba(240,192,64,0.25)'; ctx.lineWidth = 1; ctx.stroke();
ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI*2);
ctx.strokeStyle = 'rgba(240,192,64,0.15)'; ctx.lineWidth = 0.5; ctx.stroke();
```

### Step 3: 별자리 점 패턴 추가 (drawStars 대체)
현재 `drawStars`는 단순 픽셀점. 커버에만 별자리 연결선 추가:
```typescript
// 커버 전용 별자리 장식 (7~9개 점 + 연결선)
const constellationPoints = [
  [W*0.12, CH*0.15], [W*0.18, CH*0.09], [W*0.25, CH*0.13],
  [W*0.22, CH*0.21], [W*0.15, CH*0.25],
  [W*0.78, CH*0.12], [W*0.85, CH*0.08], [W*0.82, CH*0.18],
];
// 연결선
ctx.strokeStyle = 'rgba(240,192,64,0.12)'; ctx.lineWidth = 0.8;
// 별 점
ctx.fillStyle = 'rgba(240,192,64,0.5)';
```

### Step 4: 연도 텍스트 스타일 개선
현재: 단순 금색 숫자
개선: 연도 위아래에 장식 점선 + 자간 추가
```typescript
// ctx.letterSpacing이 지원되는 경우 사용
if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '0.08em';
ctx.font = F(W * 0.148, true, true);
ctx.fillStyle = C.gold;
centeredText(ctx, String(opts.year), CH * 0.535, W);
if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & {letterSpacing: string}).letterSpacing = '0em';
```

### Step 5: 커밋
```bash
git add src/lib/pdf-generator.ts
git commit -m "design: PDF 커버 타로/점성술 스타일 리디자인"
```

---

## Task 3: PDF 운세 정보 강화 (월간 + 절기)

**Files:**
- Modify: `src/lib/pdf-generator.ts` — `drawMonthly()` (line 505~630)
- Modify: `src/lib/korean-holidays.ts` — 절기(節氣) 데이터 추가

### Step 1: korean-holidays.ts에 절기 추가
2025~2027 주요 절기 (입춘·춘분·입하·하지·입추·추분·입동·동지) 날짜를 `SOLAR_TERMS` 객체로 추가:
```typescript
export interface SolarTerm { name: string; emoji: string; }
export const SOLAR_TERMS: Record<string, SolarTerm> = {
  '2026-02-04': { name: '입춘', emoji: '🌱' },
  '2026-03-20': { name: '춘분', emoji: '🌸' },
  // ... 등
};
export function getSolarTerm(year: number, month: number, day: number): SolarTerm | null { ... }
```

### Step 2: drawMonthly — 길흉 강조 시각화
현재 월간 페이지: 날짜 숫자만 표시
개선: 오늘(today circle) + 길일/주의일 배경 강화

opts에 `saju` 데이터가 있으면 월별 길흉 정보를 색상으로 표시:
- 길일(吉日): 연한 골드 배경 `rgba(240,192,64,0.12)`
- 대길(大吉): 골드 테두리 원
- 주의(注意): 연한 레드 `rgba(255,100,100,0.10)`

### Step 3: drawMonthly — 절기 표시
해당 날짜 셀 상단에 절기명 미니 텍스트:
```typescript
const term = getSolarTerm(year, month, d);
if (term) {
  ctx.font = F(9, false, false);
  ctx.fillStyle = 'rgba(120,200,120,0.9)';
  ctx.fillText(term.emoji + term.name, cellX + 3, cellY + 12);
}
```

### Step 4: drawYearIndex — 절기 마커 추가
연간 인덱스 페이지 각 월 셀에 해당 월의 주요 절기 이모지 표시.

### Step 5: 커밋
```bash
git add src/lib/korean-holidays.ts src/lib/pdf-generator.ts
git commit -m "feat: PDF 월간·연간 절기 표시 + 길흉 강조 시각화"
```

---

## Task 4: PDF 전체 시각 품질 향상

**Files:**
- Modify: `src/lib/pdf-generator.ts` — `drawNavBar`, `drawWeekly`, `drawDaily`

### Step 1: NavBar 디자인 개선
현재: 단색 배경 직사각형
개선:
- 상단 1px 골드 구분선: `ctx.strokeStyle = 'rgba(240,192,64,0.3)'; ctx.lineWidth = 1;`
- 현재 페이지 탭: 골드 배경 + 인디고 텍스트 (반전)
- 탭 폰트 크기: 약간 키움 `F(13, ...)` → `F(14, ...)`

### Step 2: Weekly 페이지 — 날짜 헤더 개선
현재: 단순 텍스트
개선:
- 요일 헤더 배경: `T.weekHeaderBg` 색상 배경
- 월/일 표시를 숫자 크게, 요일 작게 2줄로 분리
- 오늘 날짜: 골드 원형 배경

### Step 3: Daily 페이지 — 시간대 눈금 개선
현재: 단순 가로선
개선:
- AM/PM 구분 영역 미세 배경 차이 (`rgba(0,0,0,0.015)`)
- 정시(00분) 라인 강조, 30분 라인 연하게

### Step 4: 타입 체크 + 커밋
```bash
npx tsc --noEmit
git add src/lib/pdf-generator.ts
git commit -m "design: PDF NavBar·Weekly·Daily 시각 품질 향상"
```

---

## Task 5: 홈 미리보기 → 실시간 캔버스 교체

**Files:**
- Modify: `src/app/page.tsx` — 미리보기 섹션
- Delete (or keep): `src/components/home/PreviewImageCard.tsx`
- Keep: `src/components/planner/PlannerPreviewCanvas.tsx`

### Step 1: 인터랙티브 미리보기 컴포넌트 생성
`src/components/home/PlannerPreviewSection.tsx` 신규 생성:

```tsx
'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const PlannerPreviewCanvas = dynamic(() => import('@/components/planner/PlannerPreviewCanvas'), { ssr: false });

const TABS = [
  { type: 'cover' as const,      label: '커버' },
  { type: 'year-index' as const, label: '연간' },
  { type: 'monthly' as const,    label: '월간' },
  { type: 'weekly' as const,     label: '주간' },
  { type: 'daily' as const,      label: '일간' },
];

export default function PlannerPreviewSection() {
  const [active, setActive] = useState<typeof TABS[number]['type']>('cover');
  const opts = { year: 2026, theme: 'rose', orientation: 'portrait' as const, name: '플래너 미리보기' };
  return (
    <div className="...">
      {/* 탭 버튼 */}
      <div className="flex gap-2 justify-center mb-6">
        {TABS.map(({ type, label }) => (
          <button key={type} onClick={() => setActive(type)}
            className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${
              active === type
                ? 'bg-ft-ink text-white border-ft-ink'
                : 'bg-white text-ft-muted border-ft-border hover:border-ft-ink'
            }`}>
            {label}
          </button>
        ))}
      </div>
      {/* 메인 미리보기 */}
      <div className="flex justify-center">
        <PlannerPreviewCanvas
          pageType={active} pageIdx={active === 'monthly' ? 1 : active === 'weekly' ? 1 : 0}
          opts={opts} displayWidth={280}
          className="rounded-xl overflow-hidden shadow-xl border border-ft-border"
        />
      </div>
    </div>
  );
}
```

### Step 2: page.tsx 미리보기 섹션 교체
`PREVIEW_IMAGES` 배열과 `PreviewImageCard` 사용 부분을 `PlannerPreviewSection`으로 교체:
```tsx
import PlannerPreviewSection from '@/components/home/PlannerPreviewSection';
// ...
<PlannerPreviewSection />
```

### Step 3: 타입 체크 + 커밋
```bash
npx tsc --noEmit
git add src/app/page.tsx src/components/home/PlannerPreviewSection.tsx
git commit -m "feat: 홈 플래너 미리보기 → 실시간 캔버스 + 탭 인터랙션"
```

---

## Task 6: 기능 테스트

### Step 1: TypeScript 빌드 검증
```bash
npx tsc --noEmit
npx next build
```
둘 다 에러 없어야 함.

### Step 2: 브라우저 기능 테스트 (Playwright)
- 홈페이지 로드 + 미리보기 탭 전환 (커버→월간→주간)
- 담기 버튼 → 토스트 알림
- 장바구니 드로어 열기/닫기
- /saju 사주 계산 (1990-01-01 남)
- /download PDF 생성 버튼 클릭 (브라우저 내 실제 PDF 생성)

### Step 3: 최종 푸시
```bash
git push origin main
```

---

## 컬러 토큰 참조

| 토큰 | 값 | 용도 |
|------|----|------|
| `bg-ft-paper` | `#fdfcfb` | 홈 섹션 배경 |
| `bg-ft-paper-alt` | `#f7f5f2` | 교차 섹션 |
| `text-ft-ink` | `#1e1b4b` | 헤딩 |
| `text-ft-muted` | `#6b6886` | 보조 텍스트 |
| `bg-ft-gold` | `#f0c040` | CTA 버튼 |
| `border-ft-border` | `#e4e1f0` | 카드 테두리 |
