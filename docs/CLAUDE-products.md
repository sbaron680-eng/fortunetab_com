# FortuneTab 상품 카탈로그 가이드

## 파일 위치

`src/lib/products.ts` — PRODUCTS 배열 + 헬퍼 함수

## PLANNER_YEAR 연도 관리

```typescript
// 11월부터는 다음 해 플래너 판매 → 연도 자동 전환
const d = new Date();
export const PLANNER_YEAR = d.getMonth() >= 10 ? d.getFullYear() + 1 : d.getFullYear();
```

- **빌드 시점**: Next.js SSG에서 빌드 시 계산됨 → 배포 시점 기준 연도
- **브라우저**: 클라이언트 컴포넌트에서는 실행 시점 날짜 기준 (동적 표시)
- **전환 기준**: 매년 11월 1일 (getMonth() >= 10)

## 상품 구조 (Product 타입)

```typescript
{
  id, slug, name, subtitle,
  price, originalPrice,        // originalPrice > 0 → 할인율 자동 계산
  badge, badgeColor,           // 'green'|'gold'|'red'|'blue'
  images[], thumbnailImage,
  shortDescription, description,
  features: [{ icon, title, description }],
  specs: [{ label, value }],
  downloadUrl,                 // null = 유료 (이메일 발송)
  previewTheme,                // PDF 미리보기 테마 ('rose'|'navy'|'gold'|'forest'...)
  category,                    // 'free'|'basic'|'premium'
  inStock,
  seo: { title, description, keywords },
}
```

## 현재 상품 목록

| ID | 이름 | 가격 | 모드 | 테마 |
|----|------|------|------|------|
| `common-planner` | 무료 공통 플래너 | 무료 | fortune | rose |
| `saju-planner-basic` | 사주 플래너 기본 | ₩19,000 | fortune | navy |
| `saju-planner-premium` | 사주 플래너 + 리포트 | ₩29,000 | fortune | gold |
| `practice-planner` | 실천 플래너 | 무료 | practice | forest |

## 새 상품 추가 체크리스트

- [ ] `PRODUCTS` 배열에 새 항목 추가 (`;` 대신 `,` 확인)
- [ ] `previewTheme` 지정 (`pdf-themes.ts`의 `id` 값)
- [ ] `downloadUrl` 설정 (`'/download'` = 즉시 다운, `null` = 이메일 발송)
- [ ] `generateStaticParams()` 는 자동으로 slug를 감지 (`PRODUCTS.map(p => ({ slug: p.slug }))`)
- [ ] Footer의 쇼핑 링크 업데이트 (`src/components/layout/Footer.tsx`)

## 상품 상세 페이지 (products/[slug])

- `src/app/products/[slug]/page.tsx`
- `AddToCartButton` — Zustand 카트 스토어 연동
- `PlannerProductPreview` — 5페이지 갤러리 컴포넌트
- 테마는 slug 기반으로 자동 선택 (page.tsx 내 switch 로직)
