import { supabase } from '@/lib/supabase';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
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
