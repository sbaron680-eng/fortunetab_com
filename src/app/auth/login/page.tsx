'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface LoginErrors {
  email?: string;
  password?: string;
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return '이메일을 입력해 주세요';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 주소를 입력해 주세요';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return '비밀번호를 입력해 주세요';
  return undefined;
}

function SocialLoginButtons() {
  const { loginWithOAuth, isLoading } = useAuthStore();

  return (
    <div className="space-y-2.5">
      <button
        onClick={() => loginWithOAuth('google')}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google로 계속하기
      </button>

      <button
        onClick={() => loginWithOAuth('kakao')}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 py-3 bg-[#FEE500] rounded-xl text-sm font-medium text-[#191919] hover:bg-[#FDD800] transition-all disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#191919" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.78 1.86 5.22 4.66 6.6-.14.52-.9 3.34-.93 3.55 0 0-.02.17.09.23.11.07.24.01.24.01.32-.04 3.7-2.44 4.28-2.85.54.08 1.1.12 1.66.12 5.52 0 10-3.48 10-7.8S17.52 3 12 3" />
        </svg>
        카카오로 계속하기
      </button>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});

  const handleEmailBlur = () => {
    const msg = validateEmail(email);
    setErrors((prev) => ({ ...prev, email: msg }));
  };

  const handlePasswordBlur = () => {
    const msg = validatePassword(password);
    setErrors((prev) => ({ ...prev, password: msg }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const newErrors: LoginErrors = {};
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;
    setErrors(newErrors);
    if (emailErr || passwordErr) return;

    clearError();
    const result = await login(email, password);
    if (result === 'admin') router.push('/admin');
    else if (result) router.push('/dashboard');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper py-12 px-4">
      <div className="w-full max-w-md">
        {/* 카드 */}
        <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black font-serif text-ft-ink">
              fortunetab
            </Link>
            <h1 className="mt-4 text-xl font-bold font-serif text-ft-ink">로그인</h1>
            <p className="mt-1 text-sm text-gray-500">계정에 로그인하세요</p>
          </div>

          {/* 서버 에러 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {/* 폼 */}
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
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="your@email.com"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder="••••••••"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-indigo-600" />
                <span className="text-gray-600">로그인 상태 유지</span>
              </label>
              <Link href="/auth/forgot-password" className="text-ft-ink-mid hover:text-ft-ink transition-colors">
                비밀번호 찾기
              </Link>
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
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 분리선 */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">간편 로그인</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 소셜 로그인 */}
          <SocialLoginButtons />

          {/* 회원가입 링크 */}
          <p className="mt-6 text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{' '}
            <Link href="/auth/register" className="font-semibold text-ft-ink-mid hover:text-ft-ink transition-colors">
              회원가입
            </Link>
          </p>
        </div>

        {/* 안내 */}
        <p className="mt-4 text-center text-xs text-gray-400">
          로그인 시 FortuneTab 이용약관 및 개인정보처리방침에 동의합니다.
        </p>
      </div>
    </div>
  );
}
