'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [sent, setSent] = useState(false);

  const validate = (): boolean => {
    if (!email.trim()) {
      setEmailError('이메일을 입력해주세요.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        setServerError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setServerError('알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black font-serif text-ft-ink">
              fortunetab
            </Link>
            <h1 className="mt-4 text-xl font-bold font-serif text-ft-ink">비밀번호 찾기</h1>
            <p className="mt-1 text-sm text-gray-500">
              가입한 이메일로 재설정 링크를 보내드립니다
            </p>
          </div>

          {sent ? (
            /* 전송 완료 화면 */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-indigo-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">이메일을 보냈습니다</p>
                <p className="mt-2 text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{email}</span>로<br />
                  비밀번호 재설정 링크를 발송했습니다.
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  이메일이 도착하지 않으면 스팸 폴더를 확인해주세요.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-block mt-2 text-sm font-semibold text-ft-ink-mid hover:text-ft-ink transition-colors"
              >
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
            /* 이메일 입력 폼 */
            <>
              {serverError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    이메일
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all ${
                      emailError ? 'border-red-400' : 'border-ft-border'
                    }`}
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs mt-1">{emailError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink-mid transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isLoading ? '전송 중...' : '재설정 링크 보내기'}
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
