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
  total: number,
  sajuData?: Record<string, string | undefined>
): Promise<{ orderNumber: string; orderId: string } | null> {
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      order_number: orderNumber,
      status: 'pending',
      total,
      ...(sajuData ? { saju_data: sajuData } : {}),
    })
    .select('id')
    .single();

  if (orderErr || !order) {
    console.error('[createOrder] 주문 생성 실패:', orderErr?.message, orderErr?.code, orderErr?.details, orderErr?.hint);
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

// ── 내 주문 목록 (RPC — 다운로드 추적 포함) ──────────────────────────────────
export async function fetchMyOrders() {
  const { data, error } = await supabase.rpc('get_my_orders');
  if (error) {
    console.error('[fetchMyOrders] 실패:', error);
    return [];
  }
  return data ?? [];
}

// ── 전체 주문 목록 (관리자 RPC — 사용자 이메일 + 다운로드 추적 포함) ───────────
export async function fetchAllOrders() {
  const { data, error } = await supabase.rpc('get_all_orders_admin');
  if (error) {
    console.error('[fetchAllOrders] 실패:', error);
    return [];
  }
  return data ?? [];
}

// ── 다운로드 링크 열람 추적 ───────────────────────────────────────────────────
/**
 * 이메일 내 추적 URL 클릭 시 호출.
 * - access_token 검증 (잘못된 토큰 → 예외)
 * - 최초 열람 시각 기록 (download_opened_at)
 * - 열람 횟수 증가 (download_count)
 * @returns 실제 파일 URL (null이면 아직 파일 미설정)
 */
export async function trackDownload(
  orderId: string,
  token: string
): Promise<{ fileUrl: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc('track_download', {
    p_order_id: orderId,
    p_token: token,
  });

  if (error) {
    const msg = error.message.includes('INVALID_TOKEN')
      ? '유효하지 않은 다운로드 링크입니다.'
      : '다운로드 처리 중 오류가 발생했습니다.';
    return { fileUrl: null, error: msg };
  }

  return { fileUrl: data as string | null, error: null };
}

// ── 파일 URL 설정 (관리자) ────────────────────────────────────────────────────
export async function setOrderFileUrl(
  orderId: string,
  fileUrl: string
): Promise<boolean> {
  const { error } = await supabase
    .from('orders')
    .update({ file_url: fileUrl, status: 'completed' })
    .eq('id', orderId);

  if (error) {
    console.error('[setOrderFileUrl] 실패:', error);
    return false;
  }
  return true;
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
