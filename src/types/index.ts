// ── Product Types ─────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  originalPrice: number | null;
  badge: string | null;
  badgeColor: 'green' | 'gold' | 'red' | 'blue';
  images: string[];
  thumbnailImage: string;
  shortDescription: string;
  description: string;
  features: ProductFeature[];
  specs: ProductSpec[];
  downloadUrl: string | null; // Google Drive link — 추후 연결
  previewTheme?: string;       // 상품 카드 미리보기 테마 (기본: 'rose')
  coverStyle?: 'fortune' | 'practice' | 'premium' | 'extras' | 'allinone'; // 커버 시각 스타일
  category: 'free' | 'basic' | 'premium';
  inStock: boolean;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export interface ProductFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ProductSpec {
  label: string;
  value: string;
}

// ── Cart Types ────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  qty: number;
}

// ── Auth / User Types ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  birthDate?: string | null;
  birthHour?: string | null;
  gender?: string | null;
}

export interface AuthError {
  field: 'email' | 'password' | 'name' | 'general';
  message: string;
}

// ── Order Types ───────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  createdAt: string;
  paymentMethod?: string;
}
