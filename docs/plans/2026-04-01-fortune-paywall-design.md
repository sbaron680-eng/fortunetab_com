# AI 운세 수익화 — Paywall 설계

## 개요

`/saju` (무료 계산기)를 퍼널 입구로 재설계하여, 무료 사주 계산 결과를 먼저 보여준 뒤 AI 심층 분석을 유료로 제공하는 구조.

---

## 사용자 여정

```
/saju 진입
  → 사주팔자·오행·월별운세 즉시 표시 (무료, 로그인 불필요)
  → 하단 AI 분석 티저 섹션 (블러 처리 + 잠금 UI)
  → "AI 운세 분석 보기 ₩3,900" 클릭
  → 비로그인 → /auth/login?next=/saju 리다이렉트
  → 로그인 후 → 토스페이먼츠 결제창
  → 결제 완료 → /fortune?type=saju 리다이렉트
  → 구매 확인 → AI 분석 자동 실행 → 결과 표시
```

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/layout/Header.tsx` | navLinks 순서 변경: 홈>사주계산기>AI운세>상품 |
| `src/app/saju/page.tsx` | 결과 하단 AI 티저 섹션 추가 + 결제 버튼 |
| `src/app/fortune/page.tsx` | 구매 확인 로직 추가, 미구매 시 잠금 UI 표시 |
| `src/app/checkout/page.tsx` | fortune 상품 타입 처리 추가 |
| `src/app/checkout/success/page.tsx` | fortune 구매 완료 시 /fortune 리다이렉트 |

**신규 파일 없음** — 기존 토스페이먼츠 결제 플로우 재사용

---

## DB 변경

### `fortune_purchases` 테이블 (신규)

```sql
create table fortune_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('saju', 'astrology', 'couple')),
  order_id text not null,        -- 토스페이먼츠 orderId
  used_at timestamptz,           -- null = 미사용, 값 있으면 사용 완료
  created_at timestamptz default now()
);

create index on fortune_purchases (user_id, type, used_at);
```

**구매 1회 = 분석 1회** (used_at이 null인 레코드가 있으면 분석 가능)

---

## 가격

| 상품 | 가격 |
|------|------|
| 사주 AI 분석 1회 | ₩3,900 |
| 별자리 AI 분석 1회 | ₩2,900 |
| 궁합 AI 분석 1회 | ₩3,900 |
| 3종 통합권 | ₩7,900 |

---

## `/saju` 티저 UI

결과 하단(플래너 CTA 위)에 삽입:

```
┌────────────────────────────────────────────┐
│  ✨ AI 심층 분석 — Claude AI 전용 분석      │
│                                            │
│  [블러] 목하 병화(丙火) 일간의 운기는...   │
│  [블러 카드] 직업운  재물운  건강운  관계   │
│  [블러 월별 운세 바 차트]                   │
│                                            │
│  🔒 AI 운세 분석 보기  ₩3,900             │
│  종합운세·분야별·월별·행운정보 포함        │
└────────────────────────────────────────────┘
```

- 블러: `filter: blur(5px)`, `select-none`, `pointer-events-none`
- 더미 텍스트로 실제 분석처럼 보이게

---

## `/fortune` paywall 로직

```
진입 시:
  1. 로그인 확인 → 없으면 로그인 유도
  2. fortune_purchases에서 user_id + type + used_at IS NULL 조회
  3. 구매 없음 → 잠금 UI + "구매하기" 버튼
  4. 구매 있음 → used_at 업데이트 → AI 분석 자동 실행
```

---

## 네비게이션 순서

```
현재: 홈 > AI 운세 > 사주 계산기 > 상품
변경: 홈 > 사주 계산기 > AI 운세 > 상품
```

사주 계산기(무료)를 먼저 노출하여 퍼널 진입을 늘리고,
자연스럽게 AI 운세(유료)로 연결.
