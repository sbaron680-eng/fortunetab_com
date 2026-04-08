import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, User } from '@/types';
import type { SajuData } from '@/lib/pdf-generator';

// ── Cart Store ────────────────────────────────────────────────────────────────

// 장바구니 유효 시간 (밀리초) — 24시간 초과 시 자동 비움
const CART_TTL_MS = 24 * 60 * 60 * 1000;

interface CartStore {
  items: CartItem[];
  updatedAt: number;   // 마지막 변경 시각 (Date.now())
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      updatedAt: 0,
      isOpen: false,

      addItem: (product) => {
        set((state) => {
          // 디지털 상품: 이미 담겨 있으면 중복 추가하지 않음 (수량 항상 1)
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) return state;
          return { items: [...state.items, { product, qty: 1 }], updatedAt: Date.now() };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
          updatedAt: Date.now(),
        }));
      },

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
          updatedAt: Date.now(),
        }));
      },

      clearCart: () => set({ items: [], updatedAt: 0 }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.qty, 0),
    }),
    {
      name: 'fortunetab-cart',
      // version 1: 기존 v0 데이터(updatedAt 없음)를 자동 마이그레이션
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          // v0 → v1: 기존 장바구니를 비워서 오래된 유령 아이템 제거
          return { items: [], updatedAt: 0 };
        }
        return persisted as CartStore;
      },
      // items + updatedAt만 persist, isOpen은 휘발성
      partialize: (state) => ({ items: state.items, updatedAt: state.updatedAt }),
      // 리하이드레이션 후 TTL 체크 — 24시간 초과 시 자동 비움
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.items.length > 0 && state.updatedAt > 0) {
          const age = Date.now() - state.updatedAt;
          if (age > CART_TTL_MS) {
            // setTimeout으로 hydration 완료 후 clearCart 호출 → localStorage도 동기화
            setTimeout(() => useCartStore.getState().clearCart(), 0);
          }
        }
      },
    }
  )
);

// ── Auth Store ────────────────────────────────────────────────────────────────

interface AuthStore {
  user: User | null;
  isLoading: boolean;    // 로그인/회원가입 액션 진행 중
  isAuthReady: boolean;  // AuthProvider의 getSession() 완료 여부 (인증 초기화 완료)
  error: string | null;
  setUser: (user: User | null) => void;
  setAuthReady: () => void;
  login: (email: string, password: string) => Promise<boolean | 'admin'>;
  loginWithOAuth: (provider: 'google' | 'kakao') => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateBirthData: (birthDate: string, birthHour: string, gender: string) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isLoading: false,     // 로그인/회원가입 버튼 비활성화용 — 기본 false
  isAuthReady: false,   // getSession() 완료 전까지 false → 어드민/대시보드 가드에서 대기
  error: null,

  setUser: (user) => set({ user }),
  setAuthReady: () => set({ isAuthReady: true }),

  login: async (email, password) => {
    // supabase를 동적으로 import하여 SSR 환경에서 안전하게 처리
    const { supabase } = await import('@/lib/supabase');
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ error: '이메일 또는 비밀번호가 올바르지 않습니다.', isLoading: false });
      return false;
    }
    // profiles 테이블에서 name, is_admin, 생년월일 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, is_admin, created_at, birth_date, birth_hour, gender')
      .eq('id', data.user.id)
      .single();
    const isAdmin = profile?.is_admin ?? false;
    set({
      user: {
        id: data.user.id,
        email: data.user.email!,
        name: profile?.name ?? email.split('@')[0],
        isAdmin,
        createdAt: profile?.created_at ?? data.user.created_at,
        birthDate: profile?.birth_date ?? null,
        birthHour: profile?.birth_hour ?? null,
        gender: profile?.gender ?? null,
      },
      isLoading: false,
    });
    return isAdmin ? 'admin' : true;
  },

  loginWithOAuth: async (provider) => {
    const { supabase } = await import('@/lib/supabase');
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      set({ error: error.message, isLoading: false });
    }
    // 성공 시 Supabase가 외부 OAuth 페이지로 리다이렉트 → /auth/callback으로 복귀
  },

  register: async (name, email, password) => {
    const { supabase } = await import('@/lib/supabase');
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }, // handle_new_user 트리거가 name을 profiles에 저장
    });
    if (error || !data.user) {
      set({ error: error?.message ?? '회원가입에 실패했습니다.', isLoading: false });
      return false;
    }
    set({
      user: {
        id: data.user.id,
        email: data.user.email!,
        name,
        isAdmin: false,
        createdAt: data.user.created_at,
      },
      isLoading: false,
    });
    return true;
  },

  logout: async () => {
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    set({ user: null, error: null });
  },

  updateBirthData: async (birthDate, birthHour, gender) => {
    const state = useAuthStore.getState();
    if (!state.user) return false;
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('profiles')
      .update({ birth_date: birthDate, birth_hour: birthHour, gender })
      .eq('id', state.user.id);
    if (error) return false;
    set({
      user: { ...state.user, birthDate, birthHour, gender },
    });
    return true;
  },

  clearError: () => set({ error: null }),
}));

// ── Toast Store ───────────────────────────────────────────────────────────────

interface ToastStore {
  message: string | null;
  show: (msg: string) => void;
  hide: () => void;
}

let _toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastStore>()((set) => ({
  message: null,
  show: (message) => {
    if (_toastTimer) clearTimeout(_toastTimer);
    set({ message });
    _toastTimer = setTimeout(() => set({ message: null }), 2500);
  },
  hide: () => {
    if (_toastTimer) clearTimeout(_toastTimer);
    set({ message: null });
  },
}));

// ── Saju Store ────────────────────────────────────────────────────────────────

interface SajuStore {
  savedSaju: SajuData | null;
  setSaju: (data: SajuData) => void;
  clearSaju: () => void;
}

export const useSajuStore = create<SajuStore>()(
  persist(
    (set) => ({
      savedSaju: null,
      setSaju: (data) => set({ savedSaju: data }),
      clearSaju: () => set({ savedSaju: null }),
    }),
    {
      name: 'fortunetab-saju',
      partialize: (state) => ({ savedSaju: state.savedSaju }),
    }
  )
);
