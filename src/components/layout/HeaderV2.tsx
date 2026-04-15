'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { useI18n } from '@/lib/i18n/client';
import type { Locale } from '@/lib/i18n/config';

function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const otherLocale = locale === 'ko' ? 'en' : 'ko';
  const otherLabel = locale === 'ko' ? 'EN' : '한';

  // /ko/chat → /en/chat
  const switchPath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  return (
    <Link
      href={switchPath}
      className="px-2 py-1 text-xs font-medium text-ft-muted border border-ft-border rounded-md hover:bg-ft-paper-alt transition-colors"
    >
      {otherLabel}
    </Link>
  );
}

function UserMenu({ locale }: { locale: Locale }) {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <Link
        href={`/${locale}/auth/login`}
        className="hidden md:inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-ft-ink rounded-lg hover:bg-ft-ink-mid transition-colors"
      >
        {t.common.login}
      </Link>
    );
  }

  return (
    <div ref={ref} className="hidden md:block relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ft-border hover:bg-ft-paper transition-colors"
      >
        <span className="w-6 h-6 rounded-full bg-ft-ink text-white text-xs font-bold flex items-center justify-center">
          {user.name?.[0]?.toUpperCase() ?? '?'}
        </span>
        <span className="text-sm font-medium text-ft-ink max-w-[100px] truncate">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-ft-border rounded-xl shadow-lg py-1.5 z-50 animate-fade-in">
          <p className="px-3 py-1.5 text-xs text-ft-muted border-b border-ft-border mb-1 truncate">
            {user.email}
          </p>
          <Link
            href={`/${locale}/dashboard`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ft-body hover:bg-ft-paper transition-colors"
          >
            {t.common.dashboard}
          </Link>
          <Link
            href={`/${locale}/settings`}
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-ft-body hover:bg-ft-paper transition-colors"
          >
            {t.common.settings}
          </Link>
          <div className="border-t border-ft-border mt-1 pt-1">
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="block w-full text-left px-3 py-2 text-sm text-ft-muted hover:bg-ft-paper transition-colors"
            >
              {t.common.logout}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeaderV2({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => { setMounted(true); }, []);

  const navLinks = [
    { href: `/${locale}`, label: locale === 'ko' ? '홈' : 'Home' },
    { href: `/${locale}/chat`, label: t.nav.chat },
    { href: `/${locale}/credits`, label: t.nav.credits },
    { href: `/${locale}/pricing`, label: t.nav.pricing },
  ];

  const isActive = (href: string) =>
    href === `/${locale}` ? pathname === `/${locale}` : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 bg-ft-paper/95 backdrop-blur-sm border-b border-ft-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2 group">
            <span className="text-xl font-bold font-serif text-ft-ink tracking-tight group-hover:opacity-80 transition-opacity">
              FortuneTab
            </span>
            <span className="hidden sm:inline text-[10px] text-ft-muted mt-0.5">
              {t.common.tagline.length > 30 ? 'AI Fortune' : t.common.tagline}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative text-sm font-medium transition-colors py-1 ${
                  isActive(href) ? 'text-ft-ink' : 'text-ft-body hover:text-ft-ink'
                }`}
              >
                {label}
                {isActive(href) && (
                  <span className="absolute -bottom-[0.95rem] left-0 right-0 h-0.5 bg-ft-ink rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <LocaleSwitcher locale={locale} />
            {mounted && <UserMenu locale={locale} />}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-ft-body hover:text-ft-ink transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
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

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-ft-border py-3 space-y-1 animate-fade-in">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block px-2 py-2 text-sm rounded transition-colors ${
                  isActive(href) ? 'text-ft-ink font-semibold' : 'text-ft-body hover:text-ft-ink'
                }`}
              >
                {label}
              </Link>
            ))}
            <div className="pt-2 border-t border-ft-border">
              {mounted && (user ? (
                <div className="space-y-1 px-2">
                  <Link href={`/${locale}/dashboard`} onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm text-ft-body hover:text-ft-ink">
                    {t.common.dashboard}
                  </Link>
                  <button
                    onClick={() => { useAuthStore.getState().logout(); setMobileOpen(false); }}
                    className="block w-full text-left py-2 text-sm text-ft-muted hover:text-ft-ink"
                  >
                    {t.common.logout}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 text-sm text-ft-ink font-medium"
                >
                  {t.common.login}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
