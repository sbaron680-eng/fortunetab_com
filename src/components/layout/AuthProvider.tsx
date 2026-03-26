'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

/**
 * 앱 최상단에 마운트하여 Supabase 세션을 Zustand 스토어와 동기화합니다.
 * - 페이지 새로고침 시 기존 세션 복원
 * - 탭 간 로그인/로그아웃 상태 동기화 (onAuthStateChange)
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    // 1) 앱 마운트 시 기존 세션 복원
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setUser(null);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, is_admin, created_at')
        .eq('id', session.user.id)
        .single();
      const email = session.user.email ?? '';
      setUser({
        id: session.user.id,
        email,
        name: profile?.name ?? email.split('@')[0],
        isAdmin: profile?.is_admin ?? false,
        createdAt: profile?.created_at ?? session.user.created_at,
      });
    });

    // 2) 로그인/로그아웃 이벤트 구독 (탭 간 동기화 포함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          setUser(null);
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, is_admin, created_at')
            .eq('id', session.user.id)
            .single();
          const email = session.user.email ?? '';
          setUser({
            id: session.user.id,
            email,
            name: profile?.name ?? email.split('@')[0],
            isAdmin: profile?.is_admin ?? false,
            createdAt: profile?.created_at ?? session.user.created_at,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
