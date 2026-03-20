'use client';

/**
 * /auth/callback
 *
 * Supabase 이메일 인증 / 비밀번호 재설정 / OAuth 등
 * 모든 auth redirect를 처리하는 중간 페이지.
 *
 * Supabase PKCE 플로우:
 *   이메일 링크 → /auth/callback?code=xxx&type=recovery
 *   → exchangeCodeForSession(code) → 세션 수립
 *   → type에 따라 최종 페이지로 이동
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const code  = searchParams.get('code');
    const type  = searchParams.get('type');   // 'recovery' | 'signup' | etc.
    const next  = searchParams.get('next') ?? '/';

    (async () => {
      if (!code) {
        // code 없으면 그냥 next로 이동
        router.replace(next);
        return;
      }

      const { supabase } = await import('@/lib/supabase');
      const { error: exchError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchError) {
        setError('링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.');
        return;
      }

      // 비밀번호 재설정 플로우
      if (type === 'recovery') {
        router.replace('/auth/reset-password');
        return;
      }

      router.replace(next);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">{error}</p>
        <a
          href="/auth/forgot-password"
          className="text-sm font-semibold text-ft-ink underline"
        >
          비밀번호 재설정 다시 요청하기
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <svg className="animate-spin w-7 h-7 text-ft-ink" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-ft-muted">인증 처리 중…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center py-20 px-4">
      <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-10 max-w-sm w-full">
        <Suspense fallback={
          <div className="flex justify-center py-8">
            <svg className="animate-spin w-6 h-6 text-ft-muted" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
