import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

// ── Row Types (DB 스키마와 1:1 대응) ─────────────────────────────────────────

export type UserMode = 'biz' | 'gen';
export type DaunPhase = '상승기' | '안정기' | '전환기' | '하강기';

export interface ProfileRow {
  id: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  birth_date: string | null;              // 'YYYY-MM-DD'
  birth_hour: string | null;              // '자시'~'해시' 또는 '모름'
  gender: string | null;                  // 'male' | 'female'
  birth_data_expires_at: string | null;   // 만료 시각 (입력일 + 1년)
  mode: UserMode;                         // 'biz' | 'gen'
  daun_phase: DaunPhase;                  // 현재 대운 단계
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

export interface FortunePurchaseRow {
  id: string;
  user_id: string;
  type: 'saju' | 'astrology' | 'couple';
  order_id: string;
  used_at: string | null;
  created_at: string;
}

// ── Phase 1: 명발굴 세션 ────────────────────────────────────────────────────

export type PaymentType = 'single' | 'credit' | 'subscription';

export interface FtSessionRow {
  id: string;
  user_id: string;
  mode: UserMode;
  fortune_score: number | null;
  daun_phase: DaunPhase | null;
  answers: Record<string, unknown>;       // step0~step6 답변
  result: Record<string, unknown> | null; // Claude API 결과 (story, actions, brake)
  payment_type: PaymentType;
  created_at: string;
  updated_at: string;
}

export type ServiceType = 'ft' | 'sd';

export interface CreditRow {
  id: string;
  user_id: string;
  service: ServiceType;
  balance: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubscriptionPlan = 'free' | 'single' | 'points' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'past_due';

export interface SubscriptionRow {
  id: string;
  user_id: string;
  service: ServiceType;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  ls_subscription_id: string | null;
  ls_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}
