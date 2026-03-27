import { supabase } from '@/lib/supabase';

// ── 티어 타입 ────────────────────────────────────────────────────────────────

export type Tier = 'free' | 'basic' | 'premium';

export interface TierFeatures {
  /** 사주 데이터를 PDF에 삽입 가능 여부 */
  sajuPersonalization: boolean;
  /** 사주 심층 리포트 포함 여부 */
  includesReport: boolean;
}

// ── 티어별 기능 정의 ──────────────────────────────────────────────────────────

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  free:    { sajuPersonalization: false, includesReport: false },
  basic:   { sajuPersonalization: true,  includesReport: false },
  premium: { sajuPersonalization: true,  includesReport: true  },
};

// ── 상품 ID → 티어 매핑 ───────────────────────────────────────────────────────

export const PRODUCT_TIER: Record<string, Tier> = {
  'saju-planner-basic':   'basic',
  'saju-planner-premium': 'premium',
};

// ── 사주 상품 slug 목록 ────────────────────────────────────────────────────────

export const SAJU_PRODUCT_IDS = Object.keys(PRODUCT_TIER);

// ── Supabase에서 유저 구매 티어 조회 ─────────────────────────────────────────
/**
 * 유저의 구매 내역을 기반으로 최고 티어를 반환합니다.
 * - 구매 없음 → 'free'
 * - saju-planner-basic 구매 → 'basic'
 * - saju-planner-premium 구매 → 'premium'
 */
export async function getUserTier(userId: string): Promise<Tier> {
  // 1. 결제 완료 주문 조회
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['paid', 'completed']);

  if (ordersErr || !orders?.length) return 'free';

  // 2. 해당 주문의 아이템 조회
  const orderIds = orders.map((o) => o.id as string);
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('product_id')
    .in('order_id', orderIds);

  if (itemsErr || !items?.length) return 'free';

  const productIds = items.map((i) => i.product_id as string);
  if (productIds.includes('saju-planner-premium')) return 'premium';
  if (productIds.includes('saju-planner-basic')) return 'basic';
  return 'free';
}

// ── 주문번호로 사주 상품 구매 여부 확인 ───────────────────────────────────────
/**
 * 결제 완료 화면에서 넘어온 orderId로 사주 상품 구매를 빠르게 검증합니다.
 * @returns 검증 성공 시 true
 */
export async function verifyOrderForSaju(
  userId: string,
  orderNumber: string
): Promise<boolean> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status')
    .eq('user_id', userId)
    .eq('order_number', orderNumber)
    .in('status', ['paid', 'pending', 'completed'])
    .single();

  if (error || !order) return false;

  const { data: items } = await supabase
    .from('order_items')
    .select('product_id')
    .eq('order_id', order.id)
    .in('product_id', SAJU_PRODUCT_IDS);

  return (items?.length ?? 0) > 0;
}
