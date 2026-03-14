import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// 빌드 타임(정적 생성)에 env가 없어도 모듈 로드가 실패하지 않도록 처리
// 실제 API 호출은 클라이언트 런타임에서만 발생하므로 문제 없음
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-anon-key'
);

// ── Row Types (DB 스키마와 1:1 대응) ─────────────────────────────────────────

export interface ProfileRow {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface OrderRow {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  total: number; // 원 단위 정수
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
}
