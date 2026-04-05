'use client';

import { useEffect, useRef } from 'react';

/**
 * Intersection Observer 기반 스크롤 진입 애니메이션 훅.
 * 대상 요소가 뷰포트에 진입하면 .scroll-hidden → .scroll-visible 전환.
 * staggerDelay로 자식 요소 순차 등장 가능.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; staggerDelay?: number },
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const threshold = options?.threshold ?? 0.15;
    const staggerDelay = options?.staggerDelay ?? 0;

    // 자식 중 .scroll-hidden 클래스를 가진 요소들 수집
    const targets = el.classList.contains('scroll-hidden')
      ? [el]
      : Array.from(el.querySelectorAll<HTMLElement>('.scroll-hidden'));

    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          const idx = targets.indexOf(target);
          const delay = idx >= 0 ? idx * staggerDelay : 0;

          if (delay > 0) {
            target.style.animationDelay = `${delay}ms`;
          }

          target.classList.remove('scroll-hidden');
          target.classList.add('scroll-visible');
          observer.unobserve(target);
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    targets.forEach((t) => observer.observe(t));

    return () => observer.disconnect();
  }, [options?.threshold, options?.staggerDelay]);

  return ref;
}
