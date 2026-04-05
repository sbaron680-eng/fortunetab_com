'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);       // code 교환 완료 여부
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

  // URL에 code 파라미터가 있으면 먼저 세션 교환 (Dashboard 발송 이메일 대응)
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setReady(true); // /auth/callback 경유 시 이미 세션 수립됨
      return;
    }
    (async () => {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setServerError('링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.');
      }
      setReady(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    let valid = true;

    if (!password) {
      setPasswordError('새 비밀번호를 입력해주세요.');
      valid = false;
    } else if (password.length < 6) {
      setPasswordError('비밀번호는 최소 6자 이상이어야 합니다.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (!confirm) {
      setConfirmError('비밀번호 확인을 입력해주세요.');
      valid = false;
    } else if (password !== confirm) {
      setConfirmError('비밀번호가 일치하지 않습니다.');
      valid = false;
    } else {
      setConfirmError('');
    }

    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setServerError(error.message);
      } else {
        setDone(true);
      }
    } catch {
      setServerError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper">
        <svg className="animate-spin w-7 h-7 text-ft-ink" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper py-12 px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black font-serif text-ft-ink">
              fortunetab
            </Link>
            <h1 className="mt-4 text-xl font-bold font-serif text-ft-ink">새 비밀번호 설정</h1>
            <p className="mt-1 text-sm text-gray-500">새로운 비밀번호를 입력해주세요</p>
          </div>

          {done ? (
            /* 변경 완료 화면 */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">비밀번호가 변경되었습니다</p>
                <p className="mt-2 text-sm text-gray-500">
                  새 비밀번호로 로그인할 수 있습니다.
                </p>
              </div>
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full py-3.5 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink/90 btn-press transition-colors"
              >
                로그인하러 가기
              </button>
            </div>
          ) : (
            /* 비밀번호 입력 폼 */
            <>
              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {serverError}
                  {serverError.toLowerCase().includes('expired') ||
                  serverError.toLowerCase().includes('invalid') ? (
                    <p className="mt-1 text-xs">
                      링크가 만료되었습니다.{' '}
                      <Link href="/auth/forgot-password" className="font-semibold underline">
                        다시 요청하기
                      </Link>
                    </p>
                  ) : null}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    새 비밀번호
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all ${
                      passwordError ? 'border-red-400' : 'border-ft-border'
                    }`}
                  />
                  {passwordError && (
                    <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
                    비밀번호 확인
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value);
                      if (confirmError) setConfirmError('');
                    }}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all ${
                      confirmError ? 'border-red-400' : 'border-ft-border'
                    }`}
                  />
                  {confirmError && (
                    <p className="text-red-500 text-xs mt-1">{confirmError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink/90 btn-press transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isLoading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-gray-500">
                <Link href="/auth/login" className="font-semibold text-ft-ink-mid hover:text-ft-ink transition-colors">
                  로그인 페이지로 돌아가기
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper">
        <svg className="animate-spin w-7 h-7 text-ft-muted" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
