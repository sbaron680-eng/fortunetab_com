'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface RegisterErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function validateName(value: string): string | undefined {
  if (!value.trim()) return '이름을 입력해 주세요';
  return undefined;
}

function validateEmail(value: string): string | undefined {
  if (!value.trim()) return '이메일을 입력해 주세요';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return '올바른 이메일 주소를 입력해 주세요';
  return undefined;
}

function validatePassword(value: string): string | undefined {
  if (!value) return '비밀번호를 입력해 주세요';
  if (value.length < 8) return '비밀번호는 8자 이상이어야 합니다';
  return undefined;
}

function validateConfirmPassword(value: string, password: string): string | undefined {
  if (!value) return '비밀번호 확인을 입력해 주세요';
  if (value !== password) return '비밀번호가 일치하지 않습니다';
  return undefined;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});

  const handleNameBlur = () => {
    setErrors((prev) => ({ ...prev, name: validateName(name) }));
  };

  const handleEmailBlur = () => {
    setErrors((prev) => ({ ...prev, email: validateEmail(email) }));
  };

  const handlePasswordBlur = () => {
    setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
  };

  const handleConfirmPasswordBlur = () => {
    setErrors((prev) => ({
      ...prev,
      confirmPassword: validateConfirmPassword(confirmPassword, password),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword, password);

    const newErrors: RegisterErrors = {};
    if (nameErr) newErrors.name = nameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;
    if (confirmPasswordErr) newErrors.confirmPassword = confirmPasswordErr;
    setErrors(newErrors);

    if (nameErr || emailErr || passwordErr || confirmPasswordErr) return;

    const success = await register(name, email, password);
    if (success) router.push('/');
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
            <h1 className="mt-4 text-xl font-bold font-serif text-ft-ink">회원가입</h1>
            <p className="mt-1 text-sm text-gray-500">새 계정을 만드세요</p>
          </div>

          {/* 서버/Supabase 에러 */}
          {(localError || error) && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {localError || error}
            </div>
          )}

          {/* 폼 */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                이름
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="홍길동"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.name
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                }`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.name}
                </p>
              )}
            </div>

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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder="8자 이상"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={handleConfirmPasswordBlur}
                placeholder="비밀번호 재입력"
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errors.confirmPassword
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                }`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                  <span>⚠</span> {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink-mid transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isLoading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="mt-6 text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="font-semibold text-ft-ink-mid hover:text-ft-ink transition-colors">
              로그인
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          회원가입 시 FortuneTab{' '}
          <Link href="/terms" target="_blank" className="underline hover:text-gray-600 transition-colors">
            이용약관
          </Link>{' '}
          및{' '}
          <Link href="/privacy" target="_blank" className="underline hover:text-gray-600 transition-colors">
            개인정보처리방침
          </Link>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}
