# Supabase Auth + DB + Admin 연동 구현 플랜

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mock 인증을 Supabase Auth로 교체하고, 주문 데이터를 PostgreSQL에 저장하며, 관리자 페이지(/admin)를 구현한다.

**Architecture:** Supabase JS 클라이언트를 싱글턴으로 생성해 모든 페이지에서 재사용. Row Level Security(RLS)로 사용자는 자신의 데이터만, is_admin=true인 프로필은 모든 데이터에 접근. Zustand authStore의 persist를 제거하고 Supabase의 localStorage 세션 관리에 위임.

**Tech Stack:** @supabase/supabase-js 2, Next.js 15 App Router (static export), TypeScript, Tailwind CSS 4

---

## 사전 준비: Supabase 대시보드 SQL 실행

Supabase 대시보드 → SQL Editor에서 아래 SQL을 **순서대로** 실행한다.

```sql
-- 1. profiles 테이블 (auth.users 확장)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. orders 테이블
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_number text not null unique,
  status text not null default 'pending'
    check (status in ('pending','paid','processing','completed','cancelled')),
  total integer not null,  -- 원화 정수 (₩)
  created_at timestamptz not null default now()
);

-- 3. order_items 테이블
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  price integer not null,
  qty integer not null default 1
);

-- 4. RLS 활성화
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- 5. profiles RLS 정책
create policy "본인 프로필 조회" on public.profiles
  for select using (auth.uid() = id);

create policy "본인 프로필 수정" on public.profiles
  for update using (auth.uid() = id);

create policy "관리자 전체 조회" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 6. orders RLS 정책
create policy "본인 주문 조회" on public.orders
  for select using (auth.uid() = user_id);

create policy "본인 주문 생성" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "관리자 전체 주문 조회" on public.orders
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "관리자 주문 상태 수정" on public.orders
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 7. order_items RLS 정책
create policy "본인 주문 아이템 조회" on public.order_items
  for select using (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

create policy "본인 주문 아이템 생성" on public.order_items
  for insert with check (
    exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
  );

create policy "관리자 전체 아이템 조회" on public.order_items
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- 8. 신규 가입 시 profiles 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### Task 1: 패키지 설치 + 환경 변수 설정

**Files:**
- Modify: `.env.local` (신규 생성)
- Modify: `src/lib/supabase.ts` (신규 생성)

**Step 1: 패키지 설치**

```bash
npm install @supabase/supabase-js
```

Expected output: `added 1 package`

**Step 2: .env.local 생성**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://cwnzezlgtcqkmnyojhbd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_bi9fT4Tmp5uApJ36ASeSSA_DHUFBwJQ
```

**Step 3: Supabase 싱글턴 클라이언트 생성**

`src/lib/supabase.ts` 생성:

```typescript
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// DB Row 타입
export type ProfileRow = {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
};

export type OrderRow = {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
};
```

**Step 4: 커밋**

```bash
git add src/lib/supabase.ts .env.local
git commit -m "feat: Supabase 클라이언트 설정"
```

---

### Task 2: useAuthStore → Supabase Auth로 교체

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/types/index.ts`

**Step 1: User 타입에 is_admin 추가**

`src/types/index.ts`의 User 인터페이스를 수정:

```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;        // 추가
  createdAt: string;
}
```

**Step 2: useAuthStore 전체 교체**

`src/lib/store.ts`에서 useAuthStore 블록(`// ── Auth Store` 부터 마지막 `})`까지)을 아래로 교체:

```typescript
// ── Auth Store ────────────────────────────────────────────────────────────────
// Supabase가 localStorage로 세션을 직접 관리하므로 persist 불필요

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  loadUser: () => Promise<void>;  // 앱 초기화 시 세션 복원
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  loadUser: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { set({ user: null }); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, is_admin, created_at')
      .eq('id', session.user.id)
      .single();

    set({
      user: {
        id: session.user.id,
        email: session.user.email ?? '',
        name: profile?.name ?? session.user.email?.split('@')[0] ?? '',
        isAdmin: profile?.is_admin ?? false,
        createdAt: profile?.created_at ?? session.user.created_at,
      },
    });
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ error: '이메일 또는 비밀번호가 올바르지 않습니다.', isLoading: false });
      return false;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, is_admin, created_at')
      .eq('id', data.user.id)
      .single();

    set({
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        name: profile?.name ?? '',
        isAdmin: profile?.is_admin ?? false,
        createdAt: profile?.created_at ?? data.user.created_at,
      },
      isLoading: false,
    });
    return true;
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },  // 트리거에서 name 읽음
    });
    if (error) {
      set({ error: error.message, isLoading: false });
      return false;
    }
    if (!data.user) {
      set({ error: '회원가입에 실패했습니다.', isLoading: false });
      return false;
    }
    set({
      user: {
        id: data.user.id,
        email: data.user.email ?? '',
        name,
        isAdmin: false,
        createdAt: data.user.created_at,
      },
      isLoading: false,
    });
    return true;
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
```

또한 파일 상단 import에 supabase 추가:

```typescript
import { supabase } from '@/lib/supabase';
```

**Step 3: 커밋**

```bash
git add src/lib/store.ts src/types/index.ts
git commit -m "feat: useAuthStore를 Supabase Auth로 교체"
```

---

### Task 3: 앱 레이아웃에서 세션 초기화

**Files:**
- Modify: `src/app/layout.tsx` (또는 적절한 Client Provider)
- Create: `src/components/layout/AuthProvider.tsx`

**Step 1: AuthProvider 컴포넌트 생성**

`src/components/layout/AuthProvider.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    // 앱 시작 시 기존 세션 복원
    loadUser();

    // 로그인/로그아웃 이벤트 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => subscription.unsubscribe();
  }, [loadUser]);

  return <>{children}</>;
}
```

**Step 2: layout.tsx에 AuthProvider 감싸기**

`src/app/layout.tsx`에서 `<body>` 내부를 AuthProvider로 감싼다:

```tsx
import AuthProvider from '@/components/layout/AuthProvider';

// ... body 내부
<AuthProvider>
  <Header />
  {children}
  <Footer />
</AuthProvider>
```

**Step 3: 커밋**

```bash
git add src/components/layout/AuthProvider.tsx src/app/layout.tsx
git commit -m "feat: AuthProvider로 세션 자동 복원"
```

---

### Task 4: 주문 저장 함수 생성

**Files:**
- Create: `src/lib/orders.ts`

**Step 1: orders.ts 생성**

```typescript
import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/types';

export async function createOrder(
  userId: string,
  items: CartItem[],
  total: number
): Promise<{ orderId: string; orderNumber: string } | null> {
  const orderNumber = `FT-${Date.now()}`;

  // 1. orders 행 생성
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({ user_id: userId, order_number: orderNumber, total, status: 'paid' })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('[createOrder] order insert error:', orderError);
    return null;
  }

  // 2. order_items 행 일괄 생성
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product.id,
    product_name: item.product.name,
    price: item.product.price,
    qty: item.qty,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('[createOrder] items insert error:', itemsError);
    return null;
  }

  return { orderId: order.id, orderNumber };
}

export async function fetchMyOrders(userId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*), profiles(name, email:id)`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) throw error;
}
```

**Step 2: 커밋**

```bash
git add src/lib/orders.ts
git commit -m "feat: 주문 생성/조회 함수 추가"
```

---

### Task 5: 결제 완료 후 주문 DB 저장

**Files:**
- Modify: `src/app/checkout/page.tsx`

**Step 1: 결제 완료 핸들러에 createOrder 연동**

`src/app/checkout/page.tsx`의 결제 완료 처리 부분에 아래를 추가:

```typescript
import { createOrder } from '@/lib/orders';
import { useAuthStore } from '@/lib/store';

// 결제 완료 후 처리 함수 내부에 추가:
const user = useAuthStore.getState().user;
if (user) {
  const items = useCartStore.getState().items;
  const total = useCartStore.getState().totalPrice();
  await createOrder(user.id, items, total);
}
```

> checkout 페이지의 현재 구조에 따라 적절한 위치에 삽입 (결제 성공 콜백 or 다음 단계 이동 전)

**Step 2: 커밋**

```bash
git add src/app/checkout/page.tsx
git commit -m "feat: 결제 완료 시 Supabase 주문 저장"
```

---

### Task 6: 관리자 페이지 /admin 구현

**Files:**
- Create: `src/app/admin/page.tsx`

**Step 1: 관리자 페이지 생성**

`src/app/admin/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { fetchAllOrders, updateOrderStatus } from '@/lib/orders';

const STATUS_LABELS: Record<string, string> = {
  pending:    '결제 대기',
  paid:       '결제 완료',
  processing: '처리 중',
  completed:  '배송 완료',
  cancelled:  '취소',
};

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  paid:       'bg-blue-100 text-blue-800',
  processing: 'bg-purple-100 text-purple-800',
  completed:  'bg-green-100 text-green-800',
  cancelled:  'bg-red-100 text-red-800',
};

type Order = Awaited<ReturnType<typeof fetchAllOrders>>[number];

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/auth/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }

    fetchAllOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user, isLoading, router]);

  const handleStatusChange = async (orderId: string, status: string) => {
    await updateOrderStatus(orderId, status);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0e17]">
        <div className="w-8 h-8 border-2 border-[#f0c040] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0b14] text-white px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-black text-[#f0c040] mb-2">관리자 대시보드</h1>
        <p className="text-indigo-400 text-sm mb-8">전체 주문 관리</p>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <div key={key}
                 className="rounded-xl p-4"
                 style={{ background: 'rgba(240,192,64,0.07)', border: '1px solid rgba(240,192,64,0.15)' }}>
              <p className="text-xs text-indigo-400 mb-1">{label}</p>
              <p className="text-2xl font-black text-white">
                {orders.filter((o) => o.status === key).length}
              </p>
            </div>
          ))}
        </div>

        {/* 주문 테이블 */}
        <div className="overflow-x-auto rounded-2xl"
             style={{ border: '1px solid rgba(240,192,64,0.15)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e1b4b] text-indigo-300">
                <th className="text-left px-4 py-3">주문번호</th>
                <th className="text-left px-4 py-3">사용자</th>
                <th className="text-right px-4 py-3">금액</th>
                <th className="text-left px-4 py-3">상품</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">일시</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 font-mono text-xs text-[#f0c040]">
                    {order.order_number}
                  </td>
                  <td className="px-4 py-3 text-indigo-300 text-xs">
                    {order.user_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-right font-bold">
                    ₩{order.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {(order.order_items as { product_name: string }[])
                      .map((i) => i.product_name).join(', ')}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold border-0 cursor-pointer ${STATUS_COLORS[order.status] ?? ''}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString('ko-KR')}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-600">
                    주문이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 커밋**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: 관리자 주문 대시보드 /admin 페이지"
```

---

### Task 7: Header에 관리자 링크 추가

**Files:**
- Modify: `src/components/layout/Header.tsx`

**Step 1: 관리자일 때만 보이는 링크 추가**

Header.tsx의 로그인 사용자 메뉴 부분에 추가:

```tsx
{user?.isAdmin && (
  <Link href="/admin"
        className="text-xs text-[#f0c040]/70 hover:text-[#f0c040] transition-colors">
    관리자
  </Link>
)}
```

**Step 2: 커밋**

```bash
git add src/components/layout/Header.tsx
git commit -m "feat: 관리자 사용자에게 관리자 링크 표시"
```

---

### Task 8: 빌드 검증 + 최종 PR 푸시

**Step 1: 빌드 확인**

```bash
npm run build
```

Expected: `Route (app) /admin ... ○ (Static)`
에러 없이 빌드 완료

**Step 2: .env.local을 .gitignore에 추가 확인**

```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
```

**Step 3: 최종 커밋 + 푸시**

```bash
git add -A
git commit -m "feat: Supabase 연동 완료 (Auth + DB + Admin)"
git push origin HEAD
```

---

## 테스트 체크리스트

- [ ] `/auth/register` → 회원가입 → Supabase Auth Users에 생성됨
- [ ] `/auth/login` → 로그인 성공 → 새로고침 후 세션 유지
- [ ] 로그아웃 → user null
- [ ] 결제 완료 → Supabase orders 테이블에 행 생성
- [ ] `/admin` → 비로그인 접근 시 `/auth/login` 리다이렉트
- [ ] `/admin` → 일반 사용자 접근 시 `/` 리다이렉트
- [ ] Supabase 대시보드 → profiles 테이블 → 특정 사용자 `is_admin = true` 설정 후 `/admin` 접근 가능
- [ ] 관리자 대시보드 → 상태 변경 → DB 반영

## 관리자 계정 설정 방법

Supabase Dashboard → Table Editor → profiles → 해당 행의 `is_admin`을 `true`로 변경.
