/**
 * 프로모션(할인) 관리 — Supabase promotions 테이블 연동
 *
 * 어드민: CRUD 전체
 * 프론트: 활성 프로모션 조회 → 상품 가격에 동적 적용
 */

import { supabase } from './supabase';

export interface Promotion {
  id: string;
  product_slug: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  starts_at: string;
  ends_at: string | null;
  max_uses: number | null;
  current_uses: number;
  per_user_limit: number;
  min_order_amount: number;
  badge_text: string | null;
  badge_color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── 활성 프로모션 조회 (프론트엔드용) ─────────────────────────
export async function fetchActivePromotions(): Promise<Promotion[]> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('프로모션 조회 실패:', error.message);
    return [];
  }
  return (data ?? []) as Promotion[];
}

// ── 특정 상품의 할인 가격 계산 ────────────────────────────────
export function applyPromotion(
  originalPrice: number,
  promotion: Promotion | null,
): { finalPrice: number; discountPercent: number; badge: string | null } {
  if (!promotion || originalPrice === 0) {
    return { finalPrice: originalPrice, discountPercent: 0, badge: null };
  }

  let finalPrice: number;
  if (promotion.discount_type === 'percent') {
    finalPrice = Math.round(originalPrice * (1 - promotion.discount_value / 100));
  } else {
    finalPrice = Math.max(0, originalPrice - promotion.discount_value);
  }

  const discountPercent = Math.round((1 - finalPrice / originalPrice) * 100);
  return { finalPrice, discountPercent, badge: promotion.badge_text };
}

// ── 상품별 프로모션 매칭 ──────────────────────────────────────
export function getPromotionForProduct(
  slug: string,
  promotions: Promotion[],
): Promotion | null {
  // 상품 전용 프로모션 우선
  const specific = promotions.find(p => p.product_slug === slug);
  if (specific) return specific;
  // 전체 상품 프로모션
  const global = promotions.find(p => p.product_slug === null);
  return global ?? null;
}

// ── 라인 총액 계산 — per-unit 할인 적용 후 qty 곱 ─────────────
//
// confirm-payment Edge Function의 재계산 로직과 계약을 맞추기 위한 공유 함수.
// 서버에서 Deno/Edge 런타임 제약으로 이 함수를 직접 import하지는 못하지만,
// 둘이 동일 공식을 쓰도록 참조점으로 남김.
//
// Flat 할인 qty 버그 회귀 방지(2026-04-23):
//   (단가 - 할인) × qty   ✅ 올바른 계산
//   (단가 × qty) - 할인   ❌ 1회만 차감되는 버그
export function calculateLineTotal(
  unit: number,
  qty: number,
  promo: Promotion | null,
): number {
  const { finalPrice } = applyPromotion(unit, promo);
  return finalPrice * (qty ?? 1);
}

// ── 어드민: 전체 프로모션 조회 (만료 포함) ────────────────────
export async function fetchAllPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Promotion[];
}

// ── 어드민: 프로모션 생성 ─────────────────────────────────────
export async function createPromotion(promo: Partial<Promotion>): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .insert(promo)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Promotion;
}

// ── 어드민: 프로모션 수정 ─────────────────────────────────────
export async function updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Promotion;
}

// ── 어드민: 프로모션 삭제 ─────────────────────────────────────
export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

// ── 어드민: 프로모션 활성/비활성 토글 ─────────────────────────
export async function togglePromotion(id: string, isActive: boolean): Promise<void> {
  await updatePromotion(id, { is_active: isActive });
}

// ── D-day 계산 ────────────────────────────────────────────────
export function getDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
