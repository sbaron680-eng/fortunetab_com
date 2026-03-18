'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);

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

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black text-[#1e1b4b]">
              fortunetab
            </Link>
            <h1 className="mt-4 text-xl font-bold text-gray-900">새 비밀번호 설정</h1>
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
                className="w-full py-3.5 font-bold text-white bg-[#1e1b4b] rounded-xl hover:bg-indigo-800 transition-colors"
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
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      passwordError ? 'border-red-400' : 'border-gray-200'
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
                    className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${
                      confirmError ? 'border-red-400' : 'border-gray-200'
                    }`}
                  />
                  {confirmError && (
                    <p className="text-red-500 text-xs mt-1">{confirmError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 font-bold text-white bg-[#1e1b4b] rounded-xl hover:bg-indigo-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
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
