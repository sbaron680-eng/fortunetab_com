# FortuneTab — Claude 작업 가이드

## 프로젝트 개요
사주·운세 기반 PDF 플래너 이커머스 서비스. 브라우저에서 실시간으로 PDF를 생성합니다.

- **URL**: fortunetab.com (Cloudflare Pages 배포)
- **GitHub**: sbaron680-eng/fortunetab_com (main 브랜치 → 자동 배포)
- **팀**: 1인 개발 (박성준)

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

## 핵심 아키텍처

### PDF 생성 흐름
```
PlannerOptions (년도/테마/방향/페이지목록)
  → generatePlannerPDF()
    → T = getTheme(opts.theme)          // 테마 전역 변수 설정
    → 각 페이지: drawXxx(ctx, W, H, opts)  // Canvas 2D 렌더링
    → canvas.toDataURL('image/jpeg')    // JPEG 변환
    → doc.addImage() + doc.link()       // jsPDF 삽입 + 하이퍼링크
  → doc.save('filename.pdf')
```

### 미리보기 = PDF 동일성 보장
- `renderPreviewPage(canvas, pageType, pageIdx, opts)` 으로 동일한 draw 함수 호출
- `PlannerPreviewCanvas` 컴포넌트가 캔버스를 CSS `transform: scale()` 로 축소
- **정적 이미지(public/products/*.png) 는 참고용 레거시 — 상품 페이지는 PlannerProductPreview 컴포넌트 사용**

### 테마 시스템
- `src/lib/pdf-themes.ts`: 7개 테마 정의 (`ColorTheme` 인터페이스)
- 모듈 레벨 `let T: ColorTheme` 변수 — `generatePlannerPDF`/`renderPreviewPage` 시작 시 설정
- draw 함수는 `T.headerA`, `T.navA` 등 참조 (thread-safe: 브라우저 단일 스레드)

### 공휴일 시스템
- `src/lib/korean-holidays.ts`: 2025-2027 공휴일/대체공휴일/기념일
- `getHoliday(year, month0based, day)` → `HolidayInfo | null`
- 색상: `holiday/substitute` = 파스텔 레드(`#ffecec`/`#b84060`), `memorial` = 파스텔 블루(`#e8eeff`/`#5060b0`)

---

## 파일 구조 (핵심)

```
src/
├── app/
│   ├── download/page.tsx          ← PDF 생성 UI (연도/테마/방향/템플릿 선택 + 실시간 미리보기)
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
│   ├── korean-holidays.ts         ← 공휴일 데이터 2025-2027
│   ├── products.ts                ← 상품 카탈로그 (정적)
│   └── store.ts                   ← Zustand 스토어 (사주, 카트, 인증)
```

---

## PDF 생성기 규칙

### 새 페이지 타입 추가 시
1. `PageType` union에 추가
2. `drawXxx()` 함수 작성 (마지막에 `drawNavBar()` 호출 필수)
3. `renderPreviewPage()` switch에 케이스 추가
4. `generatePlannerPDF()` 의 expandedPages 루프에 케이스 추가

### 컬러 사용 규칙
- **테마 의존 색상** → `T.xxx` 사용 (헤더, 날짜 색, 네비 바)
- **고정 중립 색상** → `C.xxx` 사용 (배경, 텍스트, 규칙선, 공휴일 색)
- **절대 하드코딩 금지**: `#8b3f5c` 같은 특정 테마 색을 C 객체에 새로 추가하지 말 것

### ISO 주차
- `getWeekDates(year, isoWeek)` → `[Mon, Tue, Wed, Thu, Fri, Sat, Sun]` (0=월요일)
- 주간 페이지 컬럼 순서: 월~일 (ISO 기준)
- 일요일 = 인덱스 6 (isSun = d === 6)

### NavLink (내부 하이퍼링크)
- draw 함수가 `NavLink[]` 반환 → `generatePlannerPDF`에서 `doc.link()` 처리
- 좌표: canvas 픽셀 단위 → `scalX = PW/CW`, `scalY = PH/CH` 로 PDF pt 변환
- 현재 구현: `drawYearIndex` → 월간 페이지, `drawMonthly` → 주간 페이지

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
`src/lib/products.ts` → `PRODUCTS` 배열 직접 수정

### 폰트 로딩 이슈
`document.fonts.ready` 를 `await` 한 후 canvas 렌더링. Google Fonts (`Noto Serif KR`) 로드 실패 시 fallback 폰트로 렌더링됩니다.
