import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/types';

// ── 주문번호 생성 ─────────────────────────────────────────────────────────────
function generateOrderNumber(): string {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FT-${yyyymmdd}-${rand}`;
}

// ── 주문 생성 ─────────────────────────────────────────────────────────────────
export async function createOrder(
  userId: string,
  items: CartItem[],
  total: number
): Promise<{ orderNumber: string; orderId: string } | null> {
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      total,
    })
    .select('id')
    .single();

  if (orderErr || !order) {
    console.error('[createOrder] 주문 생성 실패:', orderErr);
    return null;
  }

  const orderItems = items.map(({ product, qty }) => ({
    order_id: order.id,
    product_id: product.id,
    product_name: product.name,
    price: product.price,
    qty,
  }));

  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsErr) {
    console.error('[createOrder] 주문 아이템 저장 실패:', itemsErr);
    // 주문은 생성됐으므로 null 대신 주문번호 반환 (아이템은 재시도 가능)
  }

  return { orderNumber, orderId: order.id };
}

// ── 내 주문 목록 ──────────────────────────────────────────────────────────────
export async function fetchMyOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchMyOrders] 실패:', error);
    return [];
  }
  return data ?? [];
}

// ── 전체 주문 목록 (관리자) ───────────────────────────────────────────────────
export async function fetchAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[fetchAllOrders] 실패:', error);
    return [];
  }
  return data ?? [];
}

// ── 주문 상태 변경 (관리자) ───────────────────────────────────────────────────
export async function updateOrderStatus(
  orderId: string,
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled'
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);

  if (error) {
    console.error('[updateOrderStatus] 실패:', error);
    return false;
  }
  return true;
}
