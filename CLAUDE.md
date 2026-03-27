# FortuneTab — Claude 작업 가이드

## 프로젝트 개요
사주·운세 기반 PDF 플래너 이커머스 서비스. 브라우저에서 실시간으로 PDF를 생성합니다.

- **URL**: fortunetab.com (Cloudflare Pages 배포)
- **GitHub**: sbaron680-eng/fortunetab_com (main 브랜치 → 자동 배포)
- **팀**: 1인 개발 (박성준)

> **세부 가이드 문서**
> - [`docs/CLAUDE-planner.md`](docs/CLAUDE-planner.md) — PDF 생성기, 테마, fortune/practice 모드
> - [`docs/CLAUDE-products.md`](docs/CLAUDE-products.md) — 상품 카탈로그, PLANNER_YEAR, 추가 체크리스트
> - [`docs/CLAUDE-philosophy.md`](docs/CLAUDE-philosophy.md) — 4가지 철학 원문, 페이지별 적용 위치

---

## 기술 스택

| 항목 | 내용 |
|------|------|
| Framework | Next.js 15 (App Router, SSG/Static Export) |
| Language | TypeScript |
| CSS | Tailwind CSS v4 |
| PDF | jsPDF + HTML5 Canvas 2D API (브라우저 전용) |
| 결제 | 토스페이먼츠 |
| 인증/DB | Supabase (Auth + PostgreSQL) |
| 배포 | Cloudflare Pages |
| 상태관리 | Zustand |

---

## 파일 구조 (핵심)

```
src/
├── app/
│   ├── download/page.tsx          ← PDF 생성 UI (모드/연도/테마/방향/템플릿 + 미리보기)
│   ├── products/[slug]/page.tsx   ← 상품 상세 (PlannerProductPreview 사용)
│   └── saju/page.tsx              ← 사주 계산기
├── components/
│   ├── planner/
│   │   └── PlannerPreviewCanvas.tsx  ← 범용 캔버스 미리보기 컴포넌트
│   └── product/
│       └── PlannerProductPreview.tsx ← 상품 페이지용 5페이지 갤러리
├── lib/
│   ├── pdf-generator.ts           ← PDF/미리보기 핵심 엔진 (v4)
│   ├── pdf-themes.ts              ← 7가지 컬러 테마
│   ├── planner-philosophy.ts      ← 4가지 플래너 철학 데이터
│   ├── korean-holidays.ts         ← 공휴일 데이터 2025-2027
│   ├── products.ts                ← 상품 카탈로그 + PLANNER_YEAR
│   └── store.ts                   ← Zustand 스토어 (사주, 카트, 인증)
docs/
├── CLAUDE-planner.md              ← PDF 엔진 상세 가이드
├── CLAUDE-products.md             ← 상품 관리 가이드
└── CLAUDE-philosophy.md           ← 플래너 철학 & 모드 가이드
```

---

## 배포

```bash
git push origin main   # → Cloudflare Pages 자동 빌드/배포
```

### Cloudflare Pages 환경변수
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 빌드 확인 (배포 전)
```bash
npx tsc --noEmit        # 타입 오류 확인
npx next build          # 빌드 성공 여부
```

---

## 이커머스 흐름

```
상품 선택 → AddToCartButton → Zustand 카트 스토어
→ /checkout → 토스페이먼츠 결제창
→ 결제 완료 콜백 → Supabase orders 테이블 저장
→ 무료 상품: /download 직접 링크 | 유료: 이메일 발송
```

---

## Supabase 테이블 (주요)
- `orders`: 주문 정보 (user_id, product_id, payment_key, status)
- `profiles`: 사용자 프로필

MCP 서버: `.mcp.json` → `cwnzezlgtcqkmnyojhbd` 프로젝트

---

## 코딩 컨벤션

- **TypeScript strict**: 모든 타입 명시, `any` 금지
- **Client/Server 경계**: PDF/캔버스/Zustand 코드는 `'use client'` 필수
- **Dynamic import**: `jsPDF`, `renderPreviewPage` 는 SSR 방지를 위해 `import()` 사용
- **폰트**: 제목/강조 = `Noto Serif KR` (SERIF 상수), 본문 = `Noto Sans KR` (SANS 상수)
- **에러 처리**: PDF 생성 실패는 `try/catch` + 사용자 에러 메시지 표시

---

## 자주 하는 작업

### 공휴일 추가/수정
`src/lib/korean-holidays.ts` → `HOLIDAYS` 객체에 `'YYYY-MM-DD': { name, type }` 추가

### 새 테마 추가
`src/lib/pdf-themes.ts` → `THEMES` 배열에 `ColorTheme` 객체 추가

### 상품 정보 수정
`src/lib/products.ts` → `PRODUCTS` 배열 직접 수정. 자세한 체크리스트: `docs/CLAUDE-products.md`

### PDF 페이지 수정
draw 함수 상세 규칙: `docs/CLAUDE-planner.md`

### 폰트 로딩 이슈
`document.fonts.ready` 를 `await` 한 후 canvas 렌더링.
