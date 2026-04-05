'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  threshold?: number;
}

export default function ScrollReveal({
  children,
  className = '',
  staggerDelay = 0,
  threshold = 0.15,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = el.querySelectorAll<HTMLElement>('.scroll-hidden');
    if (targets.length === 0) {
      // 컨테이너 자체를 대상으로
      el.classList.add('scroll-hidden');
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.remove('scroll-hidden');
            el.classList.add('scroll-visible');
            obs.disconnect();
          }
        },
        { threshold, rootMargin: '0px 0px -40px 0px' },
      );
      obs.observe(el);
      return () => obs.disconnect();
    }

    // 자식 중 .scroll-hidden 요소들을 순차 등장
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const t = entry.target as HTMLElement;
          const idx = Array.from(targets).indexOf(t);
          if (idx >= 0 && staggerDelay > 0) {
            t.style.animationDelay = `${idx * staggerDelay}ms`;
          }
          t.classList.remove('scroll-hidden');
          t.classList.add('scroll-visible');
          obs.unobserve(t);
        });
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );

    targets.forEach((t) => obs.observe(t));
    return () => obs.disconnect();
  }, [staggerDelay, threshold]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
