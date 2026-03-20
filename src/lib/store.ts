import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, User } from '@/types';
import type { SajuData } from '@/lib/pdf-generator';

// ── Cart Store ────────────────────────────────────────────────────────────────

interface CartStore {
  items: CartItem[];
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
      isOpen: false,

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { product, qty: 1 }] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
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
        }));
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.qty, 0),
      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.qty, 0),
    }),
    {
      name: 'fortunetab-cart',
      // items만 persist, isOpen은 휘발성
      partialize: (state) => ({ items: state.items }),
    }
  )
);

// ── Auth Store ────────────────────────────────────────────────────────────────

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<boolean | 'admin'>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()((set) => ({
  user: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    // supabase를 동적으로 import하여 SSR 환경에서 안전하게 처리
    const { supabase } = await import('@/lib/supabase');
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      set({ error: '이메일 또는 비밀번호가 올바르지 않습니다.', isLoading: false });
      return false;
    }
    // profiles 테이블에서 name, is_admin 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, is_admin, created_at')
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
      },
      isLoading: false,
    });
    return isAdmin ? 'admin' : true;
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
