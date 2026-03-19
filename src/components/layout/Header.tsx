'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCartStore, useAuthStore } from '@/lib/store';

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { totalItems, openCart } = useCartStore();
  const { user, logout } = useAuthStore();

  useEffect(() => { setMounted(true); }, []);

  const navLinks = [
    { href: '/', label: '홈' },
    { href: '/saju', label: '🔮 사주 계산기' },
    { href: '/products', label: '상품' },
    { href: '/#how-it-works', label: '이용안내' },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-ft-border shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mark.svg"
              alt="FortuneTab"
              width={32}
              height={32}
              className="rounded-lg group-hover:opacity-80 transition-opacity"
            />
            <span className="text-xl font-bold font-serif text-ft-ink tracking-tight group-hover:opacity-80 transition-opacity">
              FortuneTab
            </span>
            <span className="hidden sm:inline text-xs text-ft-muted mt-1">
              사주·운세 플래너
            </span>
          </Link>

          {/* 데스크탑 네비게이션 */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'text-ft-ink font-semibold'
                    : 'text-ft-body hover:text-ft-ink'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 우측 액션 */}
          <div className="flex items-center gap-3">
            {/* 장바구니 */}
            <button
              onClick={openCart}
              className="relative p-2 text-ft-body hover:text-ft-ink transition-colors"
              aria-label="장바구니"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {mounted && totalItems() > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-xs font-bold bg-ft-gold text-ft-navy rounded-full">
                  {totalItems()}
                </span>
              )}
            </button>

            {/* 로그인/마이페이지 */}
            {mounted && (user ? (
              <div className="hidden md:flex items-center gap-2">
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    className="text-xs px-2 py-1 rounded bg-ft-border text-ft-body hover:bg-ft-ink hover:text-white transition-colors"
                  >
                    관리자
                  </Link>
                )}
                <span className="text-xs text-ft-muted">{user.name}님</span>
                <button
                  onClick={() => logout()}
                  className="text-xs text-ft-muted hover:text-ft-ink transition-colors"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <Link
                href="/auth/login"
                className="hidden md:inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-ft-ink rounded-lg hover:bg-ft-ink-mid transition-colors"
              >
                로그인
              </Link>
            ))}

            {/* 모바일 햄버거 */}
            <button
              className="md:hidden p-2 text-ft-body hover:text-ft-ink transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="메뉴"
            >
              {mobileOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-ft-border py-3 space-y-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-2 py-2 text-sm rounded transition-colors ${
                  isActive(href)
                    ? 'text-ft-ink font-semibold'
                    : 'text-ft-body hover:text-ft-ink'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-ft-border">
              {mounted && (user ? (
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ft-muted">{user.name}님</span>
                    {user.isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="text-xs px-2 py-0.5 rounded bg-ft-border text-ft-body"
                      >
                        관리자
                      </Link>
                    )}
                  </div>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="text-xs text-ft-muted hover:text-ft-ink"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 text-sm text-ft-ink font-medium hover:text-ft-ink-mid"
                >
                  로그인
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
