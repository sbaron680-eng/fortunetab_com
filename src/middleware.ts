/**
 * Next.js Middleware — 로케일 리다이렉트
 *
 * 1. /api/, /_next/, /favicon 등은 스킵
 * 2. URL에 로케일이 없으면 감지하여 리다이렉트
 * 3. 우선순위: cookie → Accept-Language → 기본값(ko)
 */

import { NextResponse, type NextRequest } from 'next/server';

// ── i18n 인라인 (빌드 의존성 최소화) ──
const SUPPORTED_LOCALES = ['ko', 'en'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ko';

function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const languages = acceptLanguage
    .split(',')
    .map(part => {
      const [lang] = part.trim().split(';');
      return lang.split('-')[0].toLowerCase();
    });
  for (const lang of languages) {
    if (isValidLocale(lang)) return lang;
  }
  return DEFAULT_LOCALE;
}

const LOCALE_COOKIE = 'ft-locale';

// 미들웨어 스킵 대상 경로
const SKIP_PATTERNS = [
  '/api/',
  '/_next/',
  '/favicon',
  '/icon-',
  '/apple-touch-icon',
  '/logo-mark',
  '/products/',
  // v1 레거시 라우트 — [locale] 바깥에 존재
  '/checkout',
  '/cart',
  '/session',
  '/fortune',
  '/saju',
  '/download',
  '/history',
  '/contact',
  '/admin',
  '/auth/',
];

// ── 보안 헤더 ──
const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '0',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.tosspayments.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://www.google-analytics.com",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.lemonsqueezy.com https://www.google-analytics.com https://*.tosspayments.com",
    "frame-src https://*.tosspayments.com https://*.paypal.com",
    "frame-ancestors 'none'",
  ].join('; '),
};

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 스킵 대상 확인
  if (SKIP_PATTERNS.some(p => pathname.startsWith(p))) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 이미 로케일이 포함된 경로인지 확인
  const segments = pathname.split('/');
  const firstSegment = segments[1]; // '' | 'ko' | 'en' | 'chat' | ...

  if (isValidLocale(firstSegment)) {
    // 로케일 쿠키 설정 (변경 시)
    const response = NextResponse.next();
    if (request.cookies.get(LOCALE_COOKIE)?.value !== firstSegment) {
      response.cookies.set(LOCALE_COOKIE, firstSegment, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1년
        sameSite: 'lax',
      });
    }
    return applySecurityHeaders(response);
  }

  // 로케일 감지: cookie → Accept-Language → 기본값
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = (cookieLocale && isValidLocale(cookieLocale))
    ? cookieLocale
    : getLocaleFromHeader(request.headers.get('accept-language'));

  // 리다이렉트: /chat → /ko/chat
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return applySecurityHeaders(NextResponse.redirect(url));
}

export const config = {
  matcher: [
    // _next 정적파일 + 파비콘류만 제외 — API 포함 (보안 헤더 적용 위해)
    '/((?!_next|favicon.ico|icon-|apple-touch-icon|logo-mark|products).*)',
  ],
};
