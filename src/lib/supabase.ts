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
  // 다운로드 추적
  download_opened_at: string | null; // 최초 링크 열람 시각 (null = 미열람)
  download_count: number;            // 총 열람 횟수
  file_url: string | null;           // 관리자가 설정하는 실제 파일 URL
  access_token: string;              // 추적 URL용 보안 토큰 (UUID)
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  price: number;
  qty: number;
}
