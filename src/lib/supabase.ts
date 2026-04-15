/**
 * Supabase Browser Client + Shared Types
 *
 * This file is safe to import from client components.
 * For server-only operations (service_role key), use supabase-server.ts.
 */

import { createClient } from '@supabase/supabase-js';
import type { SajuResult, WesternProfile, FortuneGrade } from '@/lib/fortune/types';

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
  birth_date: string | null;
  birth_hour: string | null;
  gender: string | null;
  birth_data_expires_at: string | null;
  mode: UserMode;
  daun_phase: DaunPhase;
}

// ── v1 Legacy (유지) ─────────────────────────────────────────────────────────

export interface OrderRow {
  id: string;
  user_id: string;
  order_number: string;
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  total: number;
  created_at: string;
  download_opened_at: string | null;
  download_count: number;
  file_url: string | null;
  access_token: string;
}

export interface FtSessionRow {
  id: string;
  user_id: string;
  mode: UserMode;
  fortune_score: number | null;
  daun_phase: DaunPhase | null;
  answers: Record<string, string | number | boolean>;
  result: Record<string, string | number | boolean | null> | null;
  payment_type: 'single' | 'credit' | 'subscription';
  created_at: string;
  updated_at: string;
}

// ── v2: Credits (기존 테이블 재활용) ─────────────────────────────────────────

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

// ── v2: Fortune Profile (운세 캐시) ──────────────────────────────────────────

export interface FortuneProfileRow {
  id: string;
  user_id: string;
  birth_date: string;
  birth_hour: number | null;
  birth_minute: number | null;
  birth_location: string | null;
  birth_lat: number | null;
  birth_lng: number | null;
  gender: 'male' | 'female';
  saju_data: SajuResult;
  western_data: WesternProfile;
  composite_score: {
    bioScore: number;
    daunBonus: number;
    westernBonus: number;
    fortuneScore: number;
    fortunePercent: number;
    grade: FortuneGrade;
  };
  calculated_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// ── v2: Chat Session ─────────────────────────────────────────────────────────

export type ChatSessionType = 'conversation' | 'report' | 'coaching' | 'decision';
export type ChatSessionStatus = 'active' | 'completed' | 'archived';

export interface ChatSessionRow {
  id: string;
  user_id: string;
  session_type: ChatSessionType;
  title: string | null;
  status: ChatSessionStatus;
  fortune_snapshot: {
    saju: SajuResult;
    western: WesternProfile;
    composite: { fortuneScore: number; fortunePercent: number; grade: FortuneGrade };
  } | null;
  credits_spent: number;
  locale: string;
  message_count: number;
  max_messages: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── v2: Chat Message ─────────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: ChatRole;
  content: string;
  metadata: Record<string, string | number | boolean | null>;
  created_at: string;
}

// ── v2: Credit Transaction (감사추적) ────────────────────────────────────────

export type CreditReason =
  | 'purchase'
  | 'session_start'
  | 'extra_messages'
  | 'bonus'
  | 'refund'
  | 'expiry'
  | 'subscription_reset';

export interface CreditTransactionRow {
  id: string;
  user_id: string;
  amount: number;
  balance_after: number;
  reason: CreditReason;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

// ── v2: RPC Return Types ─────────────────────────────────────────────────────

export interface SpendCreditsResult {
  ok: boolean;
  error?: string;
  balance?: number;
  spent?: number;
  required?: number;
}

export interface AddCreditsResult {
  ok: boolean;
  error?: string;
  balance?: number;
  added?: number;
}
