import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

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
