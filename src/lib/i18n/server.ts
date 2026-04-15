/**
 * i18n 서버 유틸리티
 *
 * 서버 컴포넌트에서 딕셔너리를 로드하는 함수
 */

import type { Locale } from './config';

// 딕셔너리 타입 (ko.json 구조를 기반)
export type Dictionary = typeof import('./dictionaries/ko.json');

const dictionaries: Record<string, () => Promise<Dictionary>> = {
  ko: () => import('./dictionaries/ko.json').then(m => m.default),
  en: () => import('./dictionaries/en.json').then(m => m.default),
};

/**
 * 로케일에 맞는 딕셔너리 로드
 * 서버 컴포넌트에서 사용
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale];
  if (!loader) {
    return dictionaries.ko();
  }
  return loader();
}
