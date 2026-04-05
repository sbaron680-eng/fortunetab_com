'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/stores/session';
import { fortuneGradeToUnified, gradeClasses, type FortuneGradeKey } from '@/lib/grades';

const LABEL_TO_KEY: Record<string, FortuneGradeKey> = {
  '발굴 최적': 'optimal',
  '좋은 흐름': 'good',
  '중립': 'neutral',
  '충전': 'rest',
};

export default function StepFortune() {
  const { fortunePercent, daunPhase, gradeLabel, nextStep } = useSessionStore();
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const gradeKey = gradeLabel ? LABEL_TO_KEY[gradeLabel] ?? 'neutral' : 'neutral';
  const gradeStyle = fortuneGradeToUnified(gradeKey);
  const colorClass = gradeClasses(gradeStyle);
  const strokeColor = gradeStyle.strokeColor;

  // 숫자 카운트업 애니메이션
  useEffect(() => {
    const target = fortunePercent ?? 0;
    if (target === 0) return;
    let current = 0;
    const step = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { current = target; clearInterval(timer); }
      setAnimatedPercent(current);
    }, 25);
    return () => clearInterval(timer);
  }, [fortunePercent]);

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-8 text-center">
      <p className="text-xs tracking-widest text-ft-muted uppercase mb-2">Fortune Score</p>
      <h2 className="font-serif text-xl font-bold text-ft-ink mb-1">
        오늘의 타이밍 진단
      </h2>
      <p className="text-sm text-ft-muted mb-8">
        바이오리듬과 사주 대운이 만나는 지점
      </p>

      {/* Score 원형 — 그라디언트 + 글로우 */}
      <div className="relative w-40 h-40 mx-auto mb-6 animate-pulse-glow">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.6" />
              <stop offset="100%" stopColor={strokeColor} />
            </linearGradient>
          </defs>
          {/* 트랙 */}
          <circle
            cx="60" cy="60" r="52"
            fill="none" stroke="#e5e7eb" strokeWidth="6" opacity="0.5"
          />
          {/* 진행 링 */}
          <circle
            cx="60" cy="60" r="52"
            fill="none" stroke="url(#scoreGrad)" strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${animatedPercent * 3.267} 326.7`}
            className="transition-all duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-ft-ink tabular-nums">
            {animatedPercent}
          </span>
          <span className="text-xs text-ft-muted mt-0.5">/ 100</span>
        </div>
      </div>

      {/* 등급 배지 */}
      {gradeLabel && (
        <div className={`inline-block px-5 py-2 rounded-full text-sm font-semibold border mb-3 ${colorClass}`}>
          {gradeLabel}
        </div>
      )}

      {/* 대운 단계 */}
      {daunPhase && (
        <p className="text-sm text-ft-muted mb-8">
          현재 대운 흐름 · <span className="font-semibold text-ft-ink">{daunPhase}</span>
        </p>
      )}

      <button
        onClick={nextStep}
        className="w-full py-3.5 rounded-xl bg-ft-ink text-white font-semibold text-sm hover:bg-ft-ink/90 transition-colors"
      >
        발굴 시작하기
      </button>
    </div>
  );
}
