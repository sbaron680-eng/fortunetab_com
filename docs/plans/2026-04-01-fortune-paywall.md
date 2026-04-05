# Fortune Paywall Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `/saju` 무료 계산 결과 하단에 AI 분석 티저(블러)를 추가하고, 토스페이먼츠 단건 결제 후 `/fortune`에서 AI 분석을 제공하는 유료화 구조 구축.

**Architecture:** `/saju` → 무료 계산 + AI 티저(더미 블러) → 결제 → `fortune_purchases` DB 기록 → `/fortune` 진입 시 구매 확인 → AI 분석 실행. 기존 토스페이먼츠 결제 플로우(checkout/success)를 fortune 상품 타입으로 확장.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, 토스페이먼츠, TypeScript strict, Tailwind CSS v4

---

### Task 1: DB — `fortune_purchases` 테이블 생성

**Files:**
- Modify: `src/lib/supabase.ts`

**Step 1: Supabase MCP로 테이블 생성**

Supabase 대시보드 또는 MCP `execute_sql`로 실행:

```sql
create table public.fortune_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  type text not null check (type in ('saju', 'astrology', 'couple')),
  order_id text not null unique,
  used_at timestamptz default null,
  created_at timestamptz default now()
);

create index on public.fortune_purchases (user_id, type, used_at);

alter table public.fortune_purchases enable row level security;

create policy "본인 구매만 조회"
  on public.fortune_purchases for select
  using (auth.uid() = user_id);

create policy "본인 구매만 등록"
  on public.fortune_purchases for insert
  with check (auth.uid() = user_id);

create policy "본인 구매만 업데이트"
  on public.fortune_purchases for update
  using (auth.uid() = user_id);
```

**Step 2: `src/lib/supabase.ts`에 타입 추가**

기존 파일 하단에 추가:

```typescript
export interface FortunePurchaseRow {
  id: string;
  user_id: string;
  type: 'saju' | 'astrology' | 'couple';
  order_id: string;
  used_at: string | null;
  created_at: string;
}
```

**Step 3: 타입 체크**

```bash
cd fortunetab_com && npx tsc --noEmit
```
Expected: 오류 없음

**Step 4: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: fortune_purchases 테이블 타입 추가"
```

---

### Task 2: Header — 네비게이션 순서 변경

**Files:**
- Modify: `src/components/layout/Header.tsx:98-103`

**Step 1: navLinks 순서 변경**

`src/components/layout/Header.tsx`의 `navLinks` 배열:

```typescript
const navLinks = [
  { href: '/', label: '홈' },
  { href: '/saju', label: '사주 계산기' },
  { href: '/fortune', label: 'AI 운세' },
  { href: '/products', label: '상품' },
];
```

**Step 2: 타입 체크**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "fix: 네비게이션 순서 홈>사주계산기>AI운세>상품 변경"
```

---

### Task 3: `/saju` — AI 분석 티저 섹션 추가

**Files:**
- Modify: `src/app/saju/page.tsx`

**Step 1: 티저 컴포넌트 추가**

`SajuPage` 컴포넌트 내 플래너 CTA 섹션 바로 위에 삽입.
파일 상단에 `useAuthStore` import 추가 (이미 있으므로 확인).

**Step 2: 티저 섹션 코드**

플래너 CTA(`{/* 유료 플래너 CTA */}`) 섹션 바로 위에 추가:

```tsx
{/* AI 분석 티저 */}
{calculated && (
  <AiAnalysisTeaserSection />
)}
```

파일 내 서브 컴포넌트로 추가:

```tsx
function AiAnalysisTeaserSection() {
  const { user } = useAuthStore();

  function handleUnlock() {
    if (!user) {
      window.location.href = '/auth/login?next=/saju';
      return;
    }
    // 결제 파라미터를 쿼리로 넘겨 checkout으로 이동
    window.location.href = '/checkout?product=fortune-saju';
  }

  return (
    <section className="mb-8 rounded-2xl overflow-hidden border border-ft-border">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-4 flex items-center gap-2">
        <span className="text-white text-lg">✨</span>
        <div>
          <h3 className="text-white font-bold font-serif">AI 심층 분석</h3>
          <p className="text-amber-100 text-xs">Claude AI가 사주팔자를 심층 분석합니다</p>
        </div>
      </div>

      {/* 블러 미리보기 */}
      <div className="bg-white p-5 relative">
        <div className="select-none pointer-events-none blur-[5px] space-y-4">
          {/* 종합 운세 더미 */}
          <div>
            <p className="text-sm font-bold text-ft-ink mb-1">종합 운세</p>
            <p className="text-sm text-ft-muted leading-relaxed">
              목하 병화(丙火) 일간의 기운이 강하게 작용하는 한 해입니다.
              상반기에는 새로운 기회가 열리며 특히 3~4월에 중요한 전환점이 찾아옵니다.
              하반기에는 내실을 다지는 시기로 무리한 확장보다 안정에 집중하는 것이 유리합니다.
            </p>
          </div>

          {/* 분야별 카드 더미 */}
          <div className="grid grid-cols-2 gap-3">
            {['💼 직업·사업', '💰 재물·투자', '💕 인간관계', '💪 건강'].map(t => (
              <div key={t} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-ft-ink mb-1">{t}</p>
                <p className="text-xs text-ft-muted">올해는 전반적으로 상승세를 타는 시기로 적극적인 행동이 좋은 결과를 가져옵니다.</p>
              </div>
            ))}
          </div>

          {/* 월별 더미 */}
          <div className="grid grid-cols-6 gap-2">
            {[7, 8, 6, 9, 5, 8, 7, 9, 6, 8, 5, 7].map((s, i) => (
              <div key={i} className="text-center p-2 bg-gray-50 rounded-xl">
                <p className="text-xs text-ft-muted">{i + 1}월</p>
                <p className={`text-lg font-bold ${s >= 8 ? 'text-emerald-600' : s >= 6 ? 'text-ft-ink' : 'text-red-500'}`}>{s}</p>
              </div>
            ))}
          </div>

          {/* 행운 정보 더미 */}
          <div className="flex flex-wrap gap-2">
            {['행운색: 붉은색', '행운색: 황금색', '행운숫자: 3', '행운숫자: 7', '행운방향: 남쪽'].map(t => (
              <span key={t} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">{t}</span>
            ))}
          </div>
        </div>

        {/* 잠금 오버레이 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <div className="text-center px-6 py-6 rounded-2xl bg-white border border-ft-border shadow-lg max-w-xs w-full">
            <div className="text-3xl mb-2">🔒</div>
            <p className="text-sm font-bold text-ft-ink mb-1">AI 심층 분석 잠금</p>
            <p className="text-xs text-ft-muted mb-4 leading-relaxed">
              종합운세·직업·재물·건강·인간관계<br />월별 운세 + 행운 정보 포함
            </p>
            <button
              onClick={handleUnlock}
              className="w-full py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors text-sm"
            >
              AI 운세 분석 보기 — ₩3,900
            </button>
            <p className="text-[10px] text-ft-muted mt-2">1회 이용권 · 로그인 필요</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/saju/page.tsx
git commit -m "feat: /saju에 AI 분석 티저 섹션 추가"
```

---

### Task 4: 결제 — fortune 상품 타입 처리

**Files:**
- Modify: `src/app/checkout/page.tsx`
- Modify: `src/app/checkout/success/page.tsx`

**Step 1: `src/app/checkout/page.tsx` — fortune-saju 상품 처리**

checkout 페이지에서 `?product=fortune-saju` 쿼리 파라미터를 읽어 토스페이먼츠 결제창을 열도록 추가.

기존 코드 패턴을 참고하여 fortune 상품 처리 분기 추가:

```typescript
// 상품 정보 정의
const FORTUNE_PRODUCTS: Record<string, { name: string; amount: number; type: 'saju' | 'astrology' | 'couple' }> = {
  'fortune-saju': { name: 'AI 사주 분석 1회', amount: 3900, type: 'saju' },
  'fortune-astrology': { name: 'AI 별자리 분석 1회', amount: 2900, type: 'astrology' },
  'fortune-couple': { name: 'AI 궁합 분석 1회', amount: 3900, type: 'couple' },
};
```

**Step 2: `src/app/checkout/success/page.tsx` — fortune 구매 완료 처리**

결제 성공 콜백에서 `orderId`에 `fortune-` 접두사가 있으면 `fortune_purchases` 테이블에 insert:

```typescript
// fortune 구매인지 확인
const fortuneType = searchParams.get('fortuneType') as 'saju' | 'astrology' | 'couple' | null;
if (fortuneType) {
  await supabase.from('fortune_purchases').insert({
    user_id: session.user.id,
    type: fortuneType,
    order_id: orderId,
  });
  // /fortune?type={fortuneType} 으로 리다이렉트
  router.push(`/fortune?type=${fortuneType}`);
}
```

**Step 3: 타입 체크**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/checkout/page.tsx src/app/checkout/success/page.tsx
git commit -m "feat: 결제 플로우에 fortune 상품 타입 추가"
```

---

### Task 5: `/fortune` — 구매 확인 + 잠금 UI

**Files:**
- Modify: `src/app/fortune/page.tsx`

**Step 1: 구매 확인 훅 추가**

`FortunePage` 컴포넌트 내에 구매 확인 로직 추가:

```typescript
const [hasPurchase, setHasPurchase] = useState<boolean | null>(null);

// URL 파라미터에서 type 읽기
const searchParams = useSearchParams();
const urlType = searchParams.get('type') as FortuneTab | null;

useEffect(() => {
  if (urlType) setTab(urlType);
}, [urlType]);

// 구매 확인
useEffect(() => {
  if (!user) { setHasPurchase(false); return; }
  supabase
    .from('fortune_purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('type', tab)
    .is('used_at', null)
    .maybeSingle()
    .then(({ data }) => setHasPurchase(!!data));
}, [user, tab]);
```

**Step 2: 미구매 시 잠금 UI 표시**

`handleAnalyze` 함수 상단에 구매 확인 추가:

```typescript
async function handleAnalyze() {
  if (!user) { /* 기존 로그인 체크 */ }
  if (!hasPurchase) {
    window.location.href = `/checkout?product=fortune-${tab}`;
    return;
  }
  // ... 기존 AI 분석 코드
  // 분석 성공 후 used_at 업데이트
  await supabase
    .from('fortune_purchases')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('type', tab)
    .is('used_at', null);
}
```

**Step 3: 탭 변경 시 구매 여부 배지 표시**

탭 버튼에 구매 상태 배지 추가 (미구매 탭에 `🔒` 아이콘):

```tsx
<button key={key} onClick={...} className={...}>
  {label}
  {user && hasPurchase === false && tab !== key && (
    <span className="ml-1 text-[10px] text-amber-500">🔒</span>
  )}
</button>
```

**Step 4: `useSearchParams` 사용을 위한 Suspense 래퍼 확인**

Next.js App Router에서 `useSearchParams`는 Suspense 경계 필요. 페이지 컴포넌트를 Suspense로 래핑:

```tsx
import { Suspense } from 'react';

export default function FortunePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ft-paper" />}>
      <FortunePage />
    </Suspense>
  );
}
```

기존 `export default function FortunePage()`를 내부 컴포넌트로 변경.

**Step 5: 타입 체크 + 빌드 확인**

```bash
npx tsc --noEmit
npm run build
```

**Step 6: Commit**

```bash
git add src/app/fortune/page.tsx
git commit -m "feat: /fortune 구매 확인 및 paywall 로직 추가"
```

---

### Task 6: 최종 빌드 & 배포

**Step 1: 전체 타입 체크**

```bash
npx tsc --noEmit
```

**Step 2: 프로덕션 빌드**

```bash
npm run build
```

**Step 3: Supabase DB 마이그레이션 실행**

Task 1의 SQL을 Supabase MCP `execute_sql`로 실행 (아직 안 했다면).

**Step 4: Push & 배포**

```bash
git push origin main
```

Cloudflare Pages 자동 배포 확인.

---

## 검증 체크리스트

- [ ] `/saju` 계산 후 AI 티저 섹션 표시됨
- [ ] 비로그인 상태에서 "AI 운세 분석 보기" 클릭 → 로그인 페이지 이동
- [ ] 로그인 후 클릭 → 토스페이먼츠 결제창 열림
- [ ] 결제 완료 → `fortune_purchases` 레코드 생성됨
- [ ] `/fortune?type=saju` 리다이렉트 → AI 분석 자동 실행
- [ ] 분석 완료 후 `used_at` 업데이트됨
- [ ] 2회 분석 시도 → 재결제 유도됨
- [ ] 네비게이션 순서: 홈>사주계산기>AI운세>상품 확인
