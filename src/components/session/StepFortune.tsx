'use client';

import { useSessionStore } from '@/lib/stores/session';

const GRADE_COLORS: Record<string, string> = {
  '발굴 최적': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  '좋은 흐름': 'bg-blue-100 text-blue-800 border-blue-200',
  '중립': 'bg-gray-100 text-gray-700 border-gray-200',
  '충전': 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function StepFortune() {
  const { fortunePercent, daunPhase, gradeLabel, nextStep } = useSessionStore();

  const colorClass = gradeLabel ? GRADE_COLORS[gradeLabel] ?? GRADE_COLORS['중립'] : '';

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-8 text-center">
      <h2 className="font-serif text-xl font-bold text-ft-ink mb-2">
        Fortune Score 타이밍 진단
      </h2>
      <p className="text-sm text-ft-muted mb-8">
        바이오리듬과 사주 대운을 결합한 오늘의 흐름입니다
      </p>

      {/* Score 원형 */}
      <div className="relative w-36 h-36 mx-auto mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r="52"
            fill="none" stroke="#e5e7eb" strokeWidth="8"
          />
          <circle
            cx="60" cy="60" r="52"
            fill="none" stroke="currentColor" strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(fortunePercent ?? 0) * 3.267} 326.7`}
            className="text-ft-ink transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-ft-ink">
            {fortunePercent ?? 0}
          </span>
          <span className="text-xs text-ft-muted">/ 100</span>
        </div>
      </div>

      {/* 등급 배지 */}
      {gradeLabel && (
        <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium border mb-3 ${colorClass}`}>
          {gradeLabel}
        </div>
      )}

      {/* 대운 단계 */}
      {daunPhase && (
        <p className="text-sm text-ft-muted mb-8">
          현재 대운: <span className="font-medium text-ft-ink">{daunPhase}</span>
        </p>
      )}

      <button
        onClick={nextStep}
        className="w-full py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm hover:bg-ft-ink/90 transition-colors"
      >
        다음 단계로
      </button>
    </div>
  );
}
