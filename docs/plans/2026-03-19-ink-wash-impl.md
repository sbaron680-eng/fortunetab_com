# 묵향(Ink Wash) 리디자인 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** FortuneTab 전체 사이트를 다크 테마에서 수묵화 미니멀리즘(크림+인디고+골드)으로 전환해 신뢰감과 가독성을 높인다.

**Architecture:** globals.css의 Tailwind v4 `@theme` 토큰을 먼저 교체한 뒤, 각 페이지의 배경/텍스트 클래스를 새 토큰으로 순서대로 교체한다. 헤더는 흰 배경으로 전환하고, 푸터는 딥 인디고를 유지한다.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, Noto Serif KR (Google Fonts), TypeScript strict

---

## Task 1: 디자인 토큰 교체 (globals.css)

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (Serif 폰트 로드 추가)

**Step 1: globals.css @theme 블록 전면 교체**

```css
@theme {
  /* === 묵향 팔레트 === */
  --color-ft-paper:      #fdfcfb;   /* 기본 배경 (따뜻한 백지) */
  --color-ft-paper-alt:  #f7f5f2;   /* 교차 섹션 배경 */
  --color-ft-ink:        #1e1b4b;   /* 헤딩·강조 (먹물) */
  --color-ft-ink-mid:    #312e81;   /* 서브 헤딩 */
  --color-ft-body:       #2d2b3d;   /* 본문 텍스트 */
  --color-ft-muted:      #6b6886;   /* 보조 텍스트 */
  --color-ft-border:     #e4e1f0;   /* 카드·구분선 */
  --color-ft-gold:       #f0c040;   /* CTA 버튼 전용 */
  --color-ft-gold-h:     #e0b030;   /* 골드 hover */

  /* 이전 다크 토큰 (제거) */
  /* ft-deep, ft-base, ft-card, ft-navy, ft-purple, ft-text 등 삭제 */

  --font-sans:  'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
  --font-serif: 'Noto Serif KR', 'Georgia', serif;
}
```

**Step 2: body 기본 스타일 변경**

```css
body {
  background-color: #fdfcfb;
  color: #2d2b3d;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

**Step 3: 스크롤바 라이트 테마로 변경**

```css
::-webkit-scrollbar-track { background: #f7f5f2; }
::-webkit-scrollbar-thumb { background: #c4beff; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #312e81; }
```

**Step 4: layout.tsx에 Noto Serif KR 추가**

`next/font/google`의 기존 `Noto_Sans_KR` import 옆에:
```tsx
import { Noto_Sans_KR, Noto_Serif_KR } from 'next/font/google';
const notoSerif = Noto_Serif_KR({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
});
// body className에 notoSerif.variable 추가
```

**Step 5: 시각 확인**

미리보기에서 배경이 크림색으로 바뀌었는지, 텍스트가 어두운 인디고로 보이는지 확인.

**Step 6: TypeScript 검증**
```bash
npx tsc --noEmit
```

**Step 7: 커밋**
```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "refactor: 묵향 디자인 토큰 적용 — 크림/인디고 팔레트"
```

---

## Task 2: 헤더 (Header.tsx)

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: 헤더 배경 전환**

```
bg-ft-navy → bg-white border-b border-ft-border
```

**Step 2: 로고·네비 텍스트 색상**

```
text-ft-gold (로고) → text-ft-ink font-serif
text-white (네비) → text-ft-body
text-ft-gold (활성) → text-ft-ink font-semibold
hover:text-ft-gold → hover:text-ft-ink-mid
```

**Step 3: 로그인 버튼**

```
bg-ft-gold text-ft-navy → bg-ft-ink text-white hover:bg-ft-ink-mid
```

**Step 4: 장바구니 뱃지**

```
bg-ft-gold text-ft-navy → bg-ft-gold text-ft-ink (유지 OK — 골드 포인트)
```

**Step 5: 모바일 메뉴 배경**

```
bg-ft-navy → bg-white border-b border-ft-border
```

**Step 6: 시각 확인 + 커밋**
```bash
git add src/components/layout/Header.tsx
git commit -m "refactor: 헤더 흰 배경·인디고 텍스트로 전환"
```

---

## Task 3: 홈페이지 Hero + 플래너 라인업 (page.tsx 상단)

**Files:**
- Modify: `src/app/page.tsx` (상단 2개 섹션)

**Step 1: Hero 섹션 배경**

```
bg-gradient-to-b from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white
→ bg-ft-paper
```

헤딩:
```
text-white → text-ft-ink font-serif
text-ft-gold → text-ft-ink  (강조 span)
```

서브텍스트:
```
text-white/80 → text-ft-muted
```

장식 별(✦✧):
```
text-ft-gold/25 → text-ft-border  (훨씬 절제된 느낌)
```

배지("얼리버드"):
```
bg-ft-gold/20 text-ft-gold border-ft-gold/40
→ bg-ft-paper-alt text-ft-ink border-ft-border
```

보조 CTA 버튼("무료 체험판"):
```
border border-white/40 text-white hover:bg-white/20
→ border border-ft-border text-ft-body hover:bg-ft-paper-alt
```

체크리스트:
```
text-ft-gold → text-ft-ink-mid
text-white/70 → text-ft-muted
```

**Step 2: 플래너 라인업 섹션 배경**

```
bg-ft-card → bg-ft-paper-alt
헤딩 text-white → text-ft-ink font-serif
서브텍스트 → text-ft-muted
```

상품 카드:
```
bg-white/5 border-white/10 → bg-white border border-ft-border
상품명 text-white → text-ft-ink font-serif
설명 text-gray-300 → text-ft-muted
가격 text-ft-gold → text-ft-ink font-bold
할인가 text-gray-400 → text-ft-muted
```

**Step 3: 시각 확인 + 커밋**
```bash
git add src/app/page.tsx
git commit -m "refactor: 홈 Hero + 라인업 섹션 묵향 스타일 적용"
```

---

## Task 4: 홈페이지 나머지 섹션 (page.tsx 하단)

**Files:**
- Modify: `src/app/page.tsx` (사주 티저 ~ 최하단 CTA)

**Step 1: 사주 계산 티저 섹션**

```
bg-gradient-to-br from-ft-base to-ft-deep
→ bg-ft-paper
헤딩 → text-ft-ink font-serif
서브 → text-ft-muted
피처 카드: bg-white/10 → bg-white border border-ft-border
피처 텍스트: text-white → text-ft-body
```

**Step 2: 제작 과정 섹션**

```
bg-ft-deep → bg-ft-paper-alt
헤딩 → text-ft-ink font-serif
STEP 번호: text-ft-gold/60 → text-ft-muted
연결선: bg-ft-gold/30 → bg-ft-border
```

**Step 3: 샘플 미리보기 섹션**

```
bg-gradient-to-b from-ft-base to-ft-deep → bg-ft-paper
헤딩 → text-ft-ink font-serif
레이블 → text-ft-muted
```

**Step 4: 후기 섹션**

```
bg-ft-card → bg-ft-paper-alt
★ 색상: text-ft-gold (유지 — 별점은 골드 OK)
후기 카드: bg-white/5 → bg-white border border-ft-border
이름: text-white → text-ft-body font-semibold
```

**Step 5: FAQ 섹션**

```
bg-ft-deep → bg-ft-paper
질문: text-white → text-ft-ink font-serif
답변: text-gray-300 → text-ft-body
```

**Step 6: 최하단 CTA 섹션**

```
bg-gradient-to-r from-ft-navy to-ft-purple text-white
→ bg-ft-ink text-white  (인디고 솔리드 — 강렬한 마무리)
```

**Step 7: 시각 확인 + 커밋**
```bash
git add src/app/page.tsx
git commit -m "refactor: 홈 나머지 섹션 묵향 스타일 완성"
```

---

## Task 5: 상품 목록 + 상품 상세

**Files:**
- Modify: `src/app/products/page.tsx`
- Modify: `src/app/products/[slug]/page.tsx`

**Step 1: products/page.tsx**

```
헤더 섹션 bg-gradient → bg-ft-paper
필터 탭: 활성 bg-ft-navy text-white → bg-ft-ink text-white
         비활성 bg-white text-gray → border border-ft-border text-ft-body
상품 카드 배경 → bg-white border border-ft-border
상품명 → font-serif text-ft-ink
```

**Step 2: products/[slug]/page.tsx**

```
전체 배경 → bg-ft-paper
상품 제목 → font-serif text-ft-ink text-3xl
가격 섹션 → bg-ft-paper-alt border border-ft-border rounded-xl
CTA 버튼: bg-ft-gold text-ft-ink (유지 — 골드 CTA)
```

**Step 3: 커밋**
```bash
git add "src/app/products/page.tsx" "src/app/products/[slug]/page.tsx"
git commit -m "refactor: 상품 목록·상세 묵향 스타일 적용"
```

---

## Task 6: 사주 계산기 (saju/page.tsx)

**Files:**
- Modify: `src/app/saju/page.tsx`

**Step 1: 배경 전환**

```
bg-ft-base → bg-ft-paper
헤더 섹션 그라디언트 → bg-ft-ink (딥 인디고 솔리드)
헤딩: text-white 유지 (ft-ink 배경 위)
```

**Step 2: 입력 폼 스타일**

```
입력 카드: bg-white/5 border-white/10 → bg-white border border-ft-border
레이블: text-white → text-ft-ink font-semibold
input 배경: bg-white/10 → bg-ft-paper-alt border border-ft-border
select 배경: 동일
```

**Step 3: 결과 섹션**

```
결과 카드 배경: bg-white/10 → bg-white border border-ft-border
결과 헤딩 → font-serif text-ft-ink
월별 운세 카드: bg-white/5 → bg-white border border-ft-border
```

**Step 4: 커밋**
```bash
git add src/app/saju/page.tsx
git commit -m "refactor: 사주 계산기 묵향 스타일 적용"
```

---

## Task 7: 결제 + 인증 페이지

**Files:**
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/app/auth/login/page.tsx`
- Modify: `src/app/auth/register/page.tsx`
- Modify: `src/app/auth/forgot-password/page.tsx`
- Modify: `src/app/auth/reset-password/page.tsx`

**Step 1: 인증 페이지 공통**

```
bg-gradient-to-br from-indigo-50 to-purple-50 → bg-ft-paper
카드: bg-white rounded-3xl shadow-xl → bg-white border border-ft-border rounded-2xl shadow-sm
로고 텍스트: text-ft-ink → font-serif
버튼: bg-ft-navy → bg-ft-ink hover:bg-ft-ink-mid
```

**Step 2: checkout/page.tsx**

```
전체 배경 → bg-ft-paper
주문 요약 카드 → bg-white border border-ft-border
결제 버튼: bg-ft-gold text-ft-ink (유지 — 최종 CTA)
```

**Step 3: 커밋**
```bash
git add src/app/checkout/page.tsx src/app/auth/
git commit -m "refactor: 결제·인증 페이지 묵향 스타일 적용"
```

---

## Task 8: PDF 다운로드 페이지

**Files:**
- Modify: `src/app/download/page.tsx`

**Step 1: 배경 전환**

```
bg-gradient-to-b from-ft-navy to-ft-base → bg-ft-paper
헤딩 → font-serif text-ft-ink
섹션 카드 → bg-white border border-ft-border
테마 선택 버튼: 활성 ring-ft-gold → ring-ft-ink
```

**Step 2: 커밋**
```bash
git add src/app/download/page.tsx
git commit -m "refactor: PDF 다운로드 페이지 묵향 스타일 적용"
```

---

## Task 9: 최종 검증 + 푸시

**Step 1: TypeScript 전체 검증**
```bash
npx tsc --noEmit
```
Expected: 오류 없음

**Step 2: 전체 빌드 확인**
```bash
npx next build
```
Expected: 16개 페이지 생성 성공

**Step 3: 주요 페이지 시각 확인**
- `/` 홈 — 크림 배경, Serif 헤딩, 골드 CTA 버튼 1개
- `/products` — 흰 카드, 얇은 테두리
- `/saju` — 인디고 헤더 + 흰 폼
- `/auth/login` — 미니멀 흰 카드

**Step 4: GitHub 푸시**
```bash
git push origin main
```

---

## 주의사항

- **`bg-ft-gold` CTA는 절대 장식용으로 확산 금지** — 결제/다운로드 버튼에만 사용
- **Noto Serif KR은 H1/H2에만** — 버튼·레이블에는 Sans 유지
- **푸터 `bg-ft-ink`는 변경 금지** — 페이지 앵커 역할
- **장식 별(✦✧) 제거 또는 ft-border 색으로 최소화** — 수묵화 미학
