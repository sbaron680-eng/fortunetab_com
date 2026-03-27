# FortuneTab PDF 플래너 생성기 가이드

## 핵심 아키텍처

```
PlannerOptions (year/theme/orientation/pages/mode)
  → generatePlannerPDF()
    → T = getTheme(opts.theme)           // 테마 전역 설정
    → 각 페이지: drawXxx(ctx, W, H, opts)  // Canvas 2D 렌더링
    → canvas.toDataURL('image/jpeg')     // JPEG 변환
    → doc.addImage() + doc.link()        // jsPDF 삽입
  → doc.save('filename.pdf')
```

## 파일 위치

- `src/lib/pdf-generator.ts` — 핵심 엔진 (PageType, draw 함수, PlannerOptions)
- `src/lib/pdf-themes.ts` — 7가지 컬러 테마 (ColorTheme 인터페이스)
- `src/lib/planner-philosophy.ts` — 4가지 플래너 철학 데이터
- `src/lib/korean-holidays.ts` — 공휴일 데이터 2025–2027
- `src/components/planner/PlannerPreviewCanvas.tsx` — 범용 캔버스 미리보기 컴포넌트

## 새 PageType 추가 절차

1. `PageType` union에 추가 (pdf-generator.ts 상단)
2. `drawXxx()` 함수 작성 (마지막에 `drawNavBar()` 호출 필수)
3. `renderPreviewPage()` switch에 케이스 추가
4. `generatePlannerPDF()` expandedPages 루프에 케이스 추가

## 테마 색상 규칙

| 구분 | 변수 | 용도 |
|------|------|------|
| 테마 의존 | `T.xxx` | 헤더, 날짜 강조, 네비 바 |
| 고정 중립 | `C.xxx` | 배경, 텍스트, 규칙선, 공휴일 |

**절대 금지**: `#8b3f5c` 같은 특정 테마 색을 C 객체에 새로 추가

## fortune vs practice 모드

`PlannerOptions.mode?: 'fortune' | 'practice'` (기본: 'fortune')

| 페이지 | fortune | practice |
|--------|---------|----------|
| 커버 | "나만의 365일 플래너" / 사주 부제 | "계획하는 사람들을 위한 플래너" |
| 연간 | 12달 달력 그리드 | 연간 3대 목표 + 분기별 계획 |
| 월간 | 전체 폭 달력 | 달력 63% + OKR 우측 패널 37% |
| 일간 | 오늘의 다짐 + 시간 블록 | + MIT 3가지 + 습관 체크 5개 |

## ISO 주차 규칙

- `getWeekDates(year, isoWeek)` → `[월, 화, 수, 목, 금, 토, 일]`
- 주간 페이지 컬럼 순서: 월~일 (ISO 기준)
- 일요일 = 인덱스 6 (`isSun = d === 6`)

## NavLink (내부 하이퍼링크)

- draw 함수가 `NavLink[]` 반환 → `generatePlannerPDF`에서 `doc.link()` 처리
- 좌표: canvas 픽셀 단위 → `scalX = PW/CW`, `scalY = PH/CH` 로 PDF pt 변환
- 현재 구현: `drawYearIndex` → 월간, `drawMonthly` → 주간

## 미리보기 = PDF 동일성 보장

- `renderPreviewPage(canvas, pageType, pageIdx, opts)` 로 동일한 draw 함수 호출
- `PlannerPreviewCanvas` 컴포넌트: CSS `transform: scale()` 로 축소 표시
- `useEffect` 의존 배열: `opts.theme, opts.year, opts.orientation, opts.name, opts.mode` 포함 필수
