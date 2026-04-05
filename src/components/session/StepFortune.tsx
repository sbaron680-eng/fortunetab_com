'use client';

import { useEffect, useState } from 'react';
import { useSessionStore } from '@/lib/stores/session';

const GRADE_COLORS: Record<string, string> = {
  '발굴 최적': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '좋은 흐름': 'bg-blue-100 text-blue-800 border-blue-200',
  '중립': 'bg-gray-100 text-gray-700 border-gray-200',
  '충전': 'bg-amber-100 text-amber-800 border-amber-200',
};

const GRADE_STROKE: Record<string, string> = {
  '발굴 최적': '#059669',
  '좋은 흐름': '#2563eb',
  '중립': '#6b7280',
  '충전': '#d97706',
};

export default function StepFortune() {
  const { fortunePercent, daunPhase, gradeLabel, nextStep } = useSessionStore();
  const [animatedPercent, setAnimatedPercent] = useState(0);

  const colorClass = gradeLabel ? GRADE_COLORS[gradeLabel] ?? GRADE_COLORS['중립'] : '';
  const strokeColor = gradeLabel ? GRADE_STROKE[gradeLabel] ?? GRADE_STROKE['중립'] : '#111';

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
