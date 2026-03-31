'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore, useSajuStore } from '@/lib/store';
import { calculateSajuFromBirthData, sajuResultToSajuData } from '@/lib/saju';

/**
 * 앱 최상단에 마운트하여 Supabase 세션을 Zustand 스토어와 동기화합니다.
 * - 페이지 새로고침 시 기존 세션 복원
 * - 탭 간 로그인/로그아웃 상태 동기화 (onAuthStateChange)
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);

  useEffect(() => {
    /** 프로필 조회 → User 세팅 + 생년월일 있으면 사주 자동 계산 */
    async function syncProfile(userId: string, email: string) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, is_admin, created_at, birth_date, birth_hour, gender')
        .eq('id', userId)
        .single();
      setUser({
        id: userId,
        email,
        name: profile?.name ?? email.split('@')[0],
        isAdmin: profile?.is_admin ?? false,
        createdAt: profile?.created_at ?? new Date().toISOString(),
        birthDate: profile?.birth_date ?? null,
        birthHour: profile?.birth_hour ?? null,
        gender: profile?.gender ?? null,
      });
      // 생년월일이 있으면 사주 자동 계산 → useSajuStore 동기화
      if (profile?.birth_date) {
        try {
          const result = calculateSajuFromBirthData(profile.birth_date, profile.birth_hour);
          useSajuStore.getState().setSaju(sajuResultToSajuData(result));
        } catch { /* 계산 실패 시 무시 */ }
      }
    }

    // 1) 앱 마운트 시 기존 세션 복원
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setUser(null);
        setAuthReady();
        return;
      }
      await syncProfile(session.user.id, session.user.email ?? '');
      setAuthReady();
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
          setTimeout(() => {
            syncProfile(session.user.id, session.user.email ?? '');
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
