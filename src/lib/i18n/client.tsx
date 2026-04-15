/**
 * i18n 클라이언트 유틸리티
 *
 * 'use client' 컴포넌트에서 딕셔너리를 사용하기 위한 React Context
 */

'use client';

import { createContext, useContext } from 'react';
import type { Dictionary } from './server';
import type { Locale } from './config';

// ─── Context ──────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  value,
  children,
}: {
  value: I18nContextValue;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * 클라이언트 컴포넌트에서 딕셔너리와 로케일에 접근
 *
 * @example
 * const { t, locale } = useI18n();
 * return <h1>{t.common.appName}</h1>;
 */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return ctx;
}

// ─── 간단한 보간 유틸 ─────────────────────────────────────────────────

/**
 * 딕셔너리 값에서 {key} 형태의 플레이스홀더를 치환
 *
 * @example
 * interpolate('남은 메시지: {count}개', { count: 25 })
 * // → '남은 메시지: 25개'
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/{(\w+)}/g, (_, key) => String(params[key] ?? `{${key}}`));
}
