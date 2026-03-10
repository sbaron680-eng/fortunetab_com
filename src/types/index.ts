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
  createdAt: string;
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
