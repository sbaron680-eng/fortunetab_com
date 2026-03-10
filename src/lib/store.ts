import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, Product, User } from '@/types';

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
              isOpen: true,
            };
          }
          return { items: [...state.items, { product, qty: 1 }], isOpen: true };
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
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      // Mock login — 추후 Supabase/Firebase로 교체
      login: async (email, _password) => {
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 800)); // 로딩 시뮬레이션

        // TODO: 실제 인증 API 연동
        if (email.includes('@')) {
          const mockUser: User = {
            id: `user_${Date.now()}`,
            name: email.split('@')[0],
            email,
            createdAt: new Date().toISOString(),
          };
          set({ user: mockUser, isLoading: false });
          return true;
        }
        set({ error: '이메일 또는 비밀번호가 올바르지 않습니다.', isLoading: false });
        return false;
      },

      // Mock register — 추후 실제 API로 교체
      register: async (name, email, _password) => {
        set({ isLoading: true, error: null });
        await new Promise((r) => setTimeout(r, 1000));

        // TODO: 실제 회원가입 API 연동
        if (email.includes('@')) {
          const mockUser: User = {
            id: `user_${Date.now()}`,
            name,
            email,
            createdAt: new Date().toISOString(),
          };
          set({ user: mockUser, isLoading: false });
          return true;
        }
        set({ error: '이미 사용 중인 이메일입니다.', isLoading: false });
        return false;
      },

      logout: () => set({ user: null, error: null }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'fortunetab-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
