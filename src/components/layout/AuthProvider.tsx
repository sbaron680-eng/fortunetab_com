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
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    // 1) 앱 마운트 시 기존 세션 복원
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setUser(null);
        setAuthReady();  // 세션 없어도 초기화 완료
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
      setAuthReady();  // 세션 복원 완료
    });

    // 2) 로그인/로그아웃 이벤트 구독 (탭 간 동기화 포함)
    // ⚠️ Supabase JS v2.x: onAuthStateChange 콜백은 navigator.lock을 유지한 채 await됨
    // 콜백 내부에서 supabase.from() 호출 시 내부적으로 auth.getSession()을 호출 → 동일 lock 대기 → 데드락
    // 해결: setTimeout(fn, 0)으로 lock 스코프 밖에서 profile fetch 실행
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          setUser(null);
          return;
        }
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
          // setTimeout으로 lock 해제 후 비동기 실행 (데드락 방지)
          setTimeout(async () => {
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
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
