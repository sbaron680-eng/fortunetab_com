import { supabase } from '@/lib/supabase';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface UserWithStats extends UserRow {
  order_count: number;
  total_spent: number;
}

export async function fetchAllUsers(): Promise<UserRow[]> {
  const { data, error } = await supabase.rpc('get_all_users');
  if (error) {
    console.error('[fetchAllUsers]', error);
    return [];
  }
  return (data ?? []) as UserRow[];
}

export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  const { error } = await supabase.rpc('set_admin_status', {
    p_user_id: userId,
    p_is_admin: isAdmin,
  });
  if (error) {
    console.error('[setAdminStatus]', error);
    return false;
  }
  return true;
}

// ── 사용자별 주문 통계 (관리자) ──────────────────────────────────────────────
export async function fetchUserOrderStats(): Promise<Record<string, { count: number; total: number }>> {
  const { data, error } = await supabase
    .from('orders')
    .select('user_id, total, status');

  if (error) {
    console.error('[fetchUserOrderStats]', error);
    return {};
  }

  const stats: Record<string, { count: number; total: number }> = {};
  for (const row of data ?? []) {
    if (row.status === 'cancelled') continue;
    if (!stats[row.user_id]) stats[row.user_id] = { count: 0, total: 0 };
    stats[row.user_id].count += 1;
    stats[row.user_id].total += row.total;
  }
  return stats;
}
