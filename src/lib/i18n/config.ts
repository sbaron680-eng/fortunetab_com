/**
 * i18n 설정
 *
 * 지원 로케일 및 기본 로케일 정의
 */

export const SUPPORTED_LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'ko';

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/** Accept-Language 헤더에서 최적 로케일 추출 */
export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  // 간략 파싱: 'ko-KR,ko;q=0.9,en-US;q=0.8' → ['ko', 'en']
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

/** 로케일별 문서 방향 (현재 모두 LTR) */
export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return 'ltr';
}

/** 로케일별 HTML lang 속성값 */
export function getHtmlLang(locale: Locale): string {
  return locale === 'ko' ? 'ko-KR' : 'en';
}
