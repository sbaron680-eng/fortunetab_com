# FortuneTab 묵향(Ink Wash) 리디자인

**날짜**: 2026-03-19
**범위**: 사이트 전체
**목표**: 과도한 다크 테마 → 신뢰감 있는 수묵화 미니멀리즘

---

## 배경

현재 디자인은 네이비/블랙 다크 테마로 게임/엔터테인먼트 사이트처럼 보임.
운세·사주·타로 서비스에 걸맞은 "고요하고 권위 있는" 신뢰감이 부족.

---

## 디자인 방향 — 묵향 (Ink Wash)

한국 수묵화(水墨畫)에서 영감. 순백 배경에 인디고를 먹물처럼 사용.
극도의 여백과 Serif 타이포그래피로 권위와 신뢰를 표현.

참고 레퍼런스: Co-Star 앱, 프리미엄 한의원 사이트, 명리학 전문 서비스

---

## 색상 시스템

| 토큰 | 값 | 용도 |
|------|----|------|
| `ft-paper`     | `#fdfcfb` | 기본 배경 (따뜻한 백지) |
| `ft-paper-alt` | `#f7f5f2` | 교차 섹션 배경 |
| `ft-ink`       | `#1e1b4b` | 헤딩·강조 (먹물) |
| `ft-ink-mid`   | `#312e81` | 서브 헤딩 |
| `ft-body`      | `#2d2b3d` | 본문 텍스트 |
| `ft-muted`     | `#6b6886` | 보조 텍스트 |
| `ft-border`    | `#e4e1f0` | 카드·구분선 (라벤더-그레이) |
| `ft-gold`      | `#f0c040` | CTA 버튼 전용 |
| `ft-gold-h`    | `#e0b030` | 골드 hover |
| `ft-footer-bg` | `#1e1b4b` | 푸터 배경 (딥 인디고) |

---

## 타이포그래피

| 요소 | 폰트 | 굵기 | 색상 |
|------|------|------|------|
| H1/H2 | Noto Serif KR | 700 | `ft-ink` |
| H3/H4 | Noto Serif KR | 600 | `ft-ink-mid` |
| 본문 | Noto Sans KR | 400 | `ft-body` |
| 레이블/캡션 | Noto Sans KR | 500 | `ft-muted` |
| 섹션 상단 레이블 | Noto Sans KR, tracking-widest, uppercase | 500 | `ft-muted` |

---

## 레이아웃 원칙

1. **극도의 여백**: 섹션 `py-20` 이상, 요소 간 `gap-8` 이상
2. **그라디언트 전면 제거**: `bg-gradient-*` → flat `ft-paper` / `ft-paper-alt`
3. **카드 스타일**: 흰 배경 + `1px ft-border` 테두리 (그림자 없음 또는 `shadow-sm`)
4. **골드 절제**: Primary CTA 버튼 하나에만 집중, 장식용 사용 금지
5. **구분선**: 배경 전환보다 `1px` 인디고/라벤더 수평선 선호
6. **헤더**: 흰 배경, 인디고 로고·네비, 하단 `1px ft-border`

---

## 페이지별 변경 내용

### 공통 (globals.css + Header + Footer)
- `@theme` 토큰 업데이트 (ft-paper, ft-ink, ft-body, ft-border 추가)
- `body` 배경: `#0f0e1a` → `#fdfcfb`
- `Header`: `bg-ft-navy` → `bg-white border-b border-ft-border`, 텍스트 `text-ft-ink`
- `Footer`: 딥 인디고 유지

### 홈 (page.tsx)
- Hero: 크림 배경 + 대형 Serif 헤딩 + 골드 Primary CTA 1개
- 플래너 라인업: 흰 카드 + 얇은 테두리
- 사주 티저: `ft-paper-alt` 배경
- 제작 과정: 흰 배경 + 인디고 step 번호
- 미리보기·후기·FAQ·CTA: 교차 배경 패턴

### 상품 목록 (products/page.tsx)
- 필터 탭: 흰 배경, 활성 탭 `ft-ink` 색상
- 상품 카드: 흰 + 얇은 테두리

### 상품 상세 (products/[slug]/page.tsx)
- 전체 흰 배경, 가격/CTA 섹션 `ft-paper-alt`

### 사주 계산기 (saju/page.tsx)
- 폼: 흰 카드 스타일
- 결과: `ft-paper-alt` 배경

### 결제·인증 (checkout, auth/*)
- 폼 배경 `from-indigo-50 to-purple-50` → `ft-paper`
- 입력 필드 테두리 `ft-border`

---

## 구현 순서

1. `globals.css` — 토큰 추가, body 배경 변경
2. `Header.tsx` — 흰 헤더로 전환
3. `page.tsx` — Hero + 섹션 배경 전환
4. `products/` 상품 목록 + 상세
5. `saju/page.tsx`
6. `checkout/` + `auth/`
7. `download/page.tsx`
8. TypeScript 검증 + 시각 확인

---

## 성공 기준

- [ ] 모든 `bg-gradient-to-*` 다크 배경 제거
- [ ] 헤더 흰 배경으로 전환
- [ ] H1/H2 전체 Noto Serif KR 적용
- [ ] 골드 사용: CTA 버튼에만 한정
- [ ] WCAG AA 대비율 통과 (본문 4.5:1 이상)
- [ ] `npx tsc --noEmit` 통과
