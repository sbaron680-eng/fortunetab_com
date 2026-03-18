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
    const success = await login(email, password);
    if (success) router.push('/');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4">
      <div className="w-full max-w-md">
        {/* 카드 */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-black text-[#1e1b4b]">
              fortunetab
            </Link>
            <h1 className="mt-4 text-xl font-bold text-gray-900">로그인</h1>
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
                    : 'border-gray-200 focus:ring-indigo-500 focus:border-transparent'
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
                    : 'border-gray-200 focus:ring-indigo-500 focus:border-transparent'
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
              <Link href="/auth/forgot-password" className="text-indigo-600 hover:text-indigo-800 transition-colors">
                비밀번호 찾기
              </Link>
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
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 분리선 */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* 회원가입 링크 */}
          <p className="text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{' '}
            <Link href="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
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
