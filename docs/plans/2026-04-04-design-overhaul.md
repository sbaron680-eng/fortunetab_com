# FortuneTab 전체 디자인 개선 — 2026-04-04

## 개요
FortuneTab의 모든 페이지, 컴포넌트, PDF 디자인을 체계적으로 개선.
Phase A(공통 시스템) → Phase B(페이지) → Phase D(PDF) 순서로 진행.

## Phase A: 공통 디자인 시스템

### A1. globals.css 애니메이션 확장
- `scroll-reveal`: 스크롤 진입 시 fade+slide-up (Intersection Observer)
- `hover-lift`: 카드 hover shadow + translateY(-2px)
- `btn-press`: active scale(0.98)
- `skeleton-pulse`: shimmer 로딩
- `accordion-open`: max-height 전환
- focus-visible: `#4338ca` → `var(--color-ft-navy)`

### A2. useScrollReveal 훅
- Intersection Observer 기반 재사용 훅
- threshold: 0.15, rootMargin: '0px 0px -40px 0px'
- `.scroll-hidden` → `.scroll-visible` 전환

### A3. Header
- 모바일 메뉴 slide-in-right 애니메이션
- 장바구니 bounce 피드백
- 활성 링크 ft-red 하단 바
- 드롭다운 fade-in

### A4. Footer
- 링크 transition-colors
- 텍스트 대비 향상 (white/50→60, white/35→45)

## Phase B: 페이지별 개선

### B1. 홈페이지
- Hero stagger-in, CTA hover-lift
- How It Works 스크롤 순차 등장
- 상품 카드 hover-lift + shadow
- 리뷰 모바일 캐러셀
- FAQ slide-down 아코디언
- 전 섹션 scroll-reveal

### B2. 로그인
- 폼 fade-in, 에러 slide-up
- 비밀번호 토글
- 소셜 버튼 hover 강화

### B3. 대시보드
- 상태 4색 통일 (amber/blue/emerald/red)
- 로딩 스켈레톤
- 빈 상태 개선

### B4. 가격
- 카드 hover shadow
- 추천 플랜 강조 강화

### B5. 상품 상세
- 기능 카드 hover-lift
- padding 정규화

## Phase D: PDF

### D1. 플래너 테마
- 일요일 텍스트 테마별 커스텀
- 밝은 테마 셀 대비 향상

### D2. 세션 결과 PDF
- 하드코딩 색상 → 시스템 색상
- GROW 배지 웹 UI와 통일

## 기술 원칙
- CSS-only 애니메이션 우선
- JS는 Intersection Observer만
- 기존 ft-* 토큰 최대 활용
- 새 색상 추가 최소화
