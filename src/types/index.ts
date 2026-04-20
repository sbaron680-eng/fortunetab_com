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
  /** 이 상품이 포함하는 페이지 목록 — 상세 페이지 "포함 내용" 체크리스트에 사용 */
  includedPages: IncludedPage[];
  /** 상세 페이지 갤러리에 실시간 렌더될 미리보기 페이지 목록 — 상품 특성별 차별화 */
  previewPages?: PreviewPageConfig[];
  /** 이 상품이 다른 상품과 구별되는 핵심 가치 3~4개 (짧게) — 비교표/히어로에 사용 */
  differentiators: string[];
  /** 비슷한 이름이지만 이 상품엔 없는 것 — 오해 방지 */
  notIncluded?: string[];
  /** 비교 매트릭스 한 줄 요약 (가로 매트릭스에서 사용) */
  compareRow: CompareRow;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export interface IncludedPage {
  icon: string;
  label: string;
  count: string;       // "1p" | "12p" | "52주" | "선택 7종" 등
  note?: string;       // "사주 맞춤" 등 부가 설명
  highlight?: boolean; // 이 상품 고유 페이지 강조용
}

/** 상품 상세 페이지 갤러리에 표시될 단일 미리보기 페이지 설정 */
export interface PreviewPageConfig {
  /** pdf-utils.ts의 PageType — 메인 5종 or 부록 28종 중 하나 */
  type: string;
  label: string;
  icon: string;
  /** month 0-11 | week 1-52 | daily dayOfYear */
  idx?: number;
}

/** 6개 상품 가로 비교용 단일 행 */
export interface CompareRow {
  core4: '포함' | '일부' | '미포함';     // 커버·연간·월간·주간 (일간 제외 4종)
  dailyCount: '샘플 1p' | '365p' | '미포함'; // 일간 스케줄 분량
  sajuCustom: boolean;                   // 사주 맞춤 여부
  sajuReport: boolean;                   // 20p 사주 리포트 여부
  practiceKit: boolean;                  // OKR·MIT·습관 트래커 여부
  extrasCount: number;                   // 부록 페이지 수 (0~28)
  repeat: boolean;                       // 12개월·52주 반복 페이지 여부
  delivery: '즉시' | '이메일';            // 배송 방식
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
