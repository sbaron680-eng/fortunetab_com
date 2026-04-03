'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSessionStore } from '@/lib/stores/session';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function ResultContent() {
  const { user } = useAuthStore();
  const {
    mode, fortunePercent, daunPhase, gradeLabel, answers, result,
    setMode, setFortuneScore, setResult, setAnswer, setSessionId,
  } = useSessionStore();
  const [isDownloading, setIsDownloading] = useState(false);

  // 결제 후 복귀 시 sessionStorage에서 세션 데이터 복구 + DB 저장
  useEffect(() => {
    if (result) return; // 이미 결과가 있으면 스킵

    const pending = sessionStorage.getItem('ft_pending_session');
    if (!pending) return;

    try {
      const data = JSON.parse(pending);
      sessionStorage.removeItem('ft_pending_session');

      // Zustand 스토어 복원
      if (data.mode) setMode(data.mode);
      if (data.fortuneScore != null && data.daunPhase) {
        setFortuneScore(data.fortuneScore, data.fortunePercent ?? 0, data.daunPhase, data.gradeLabel ?? '');
      }
      if (data.answers) {
        for (const [key, val] of Object.entries(data.answers)) {
          if (typeof val === 'string') setAnswer(key as 'step1', val);
        }
      }
      if (data.result) {
        setResult(data.result);

        // DB에 세션 저장 (단건 결제 완료 후)
        if (user) {
          supabase
            .from('ft_sessions')
            .insert({
              user_id: user.id,
              mode: data.mode ?? 'gen',
              fortune_score: data.fortuneScore,
              daun_phase: data.daunPhase,
              answers: data.answers,
              result: data.result,
              payment_type: 'single',
            })
            .select('id')
            .single()
            .then(({ data: row }) => {
              if (row) setSessionId(row.id);
            });
        }
      }
    } catch {
      sessionStorage.removeItem('ft_pending_session');
    }
  }, [result, user, setMode, setFortuneScore, setResult, setAnswer, setSessionId]);

  const handleDownloadPDF = useCallback(async () => {
    if (!result || !daunPhase || !gradeLabel) return;
    setIsDownloading(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { default: SessionResultPDF } = await import('@/components/session/SessionResultPDF');

      const blob = await pdf(
        <SessionResultPDF
          mode={mode ?? 'gen'}
          fortunePercent={fortunePercent ?? 0}
          daunPhase={daunPhase}
          gradeLabel={gradeLabel}
          result={result}
          firstSprout={answers.firstSprout}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fortunetab-session-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  }, [mode, fortunePercent, daunPhase, gradeLabel, result, answers.firstSprout]);

  if (!result) {
    return (
      <div className="text-center py-20">
        <p className="text-ft-muted mb-4">세션 결과가 없습니다.</p>
        <Link href="/session" className="text-sm text-ft-ink underline font-medium">
          새 세션 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6 text-center">
        <h1 className="font-serif text-xl font-bold text-ft-ink mb-2">
          명발굴 세션 결과
        </h1>
        <p className="text-sm text-ft-muted mb-4">
          {mode === 'biz' ? '1인 사업가' : '일반'} 모드
        </p>
        <div className="flex items-center justify-center gap-4 text-sm">
          <span className="text-ft-muted">Fortune Score <span className="font-bold text-ft-ink">{fortunePercent}</span></span>
          <span className="text-ft-border">|</span>
          <span className="text-ft-muted">대운 <span className="font-bold text-ft-ink">{daunPhase}</span></span>
          <span className="text-ft-border">|</span>
          <span className="font-medium text-ft-ink">{gradeLabel}</span>
        </div>
      </div>

      {/* 3구간 스토리 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6">
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-4">운명 흐름</h2>
        <div className="space-y-4">
          {[
            { label: '과거 뿌리', text: result.story.pastRoot, icon: '🌱' },
            { label: '현재 갈림길', text: result.story.presentCrossroad, icon: '🔀' },
            { label: '미래 수확', text: result.story.futureHarvest, icon: '🌾' },
          ].map((s) => (
            <div key={s.label} className="bg-ft-paper rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span>{s.icon}</span>
                <span className="text-xs font-semibold text-ft-ink">{s.label}</span>
              </div>
              <p className="text-sm text-ft-ink/80 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 실행 브레이크 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6">
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-4">실행 브레이크 진단</h2>
        <div className="space-y-3">
          {[
            { label: '성장 목표', text: result.brake.growthGoal },
            { label: '브레이크 행동', text: result.brake.brakeAction },
            { label: '숨겨진 이유', text: result.brake.hiddenReason },
            { label: '핵심 믿음', text: result.brake.coreBelief },
          ].map((s) => (
            <div key={s.label} className="bg-ft-paper rounded-xl p-3">
              <p className="text-xs font-semibold text-ft-ink mb-1">{s.label}</p>
              <p className="text-sm text-ft-ink/80">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* GROW 4법 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6">
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-4">GROW 4법 행동</h2>
        <div className="space-y-3">
          {[
            { letter: 'G', name: 'Ground', text: result.actions.ground },
            { letter: 'R', name: 'Root', text: result.actions.root },
            { letter: 'O', name: 'Open', text: result.actions.open },
            { letter: 'W', name: 'Water', text: result.actions.water },
          ].map((g) => (
            <div key={g.letter} className="flex gap-3 items-start bg-ft-paper rounded-xl p-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-ft-ink text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {g.letter}
              </span>
              <div>
                <p className="text-xs font-semibold text-ft-ink">{g.name}</p>
                <p className="text-sm text-ft-ink/80">{g.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 첫 싹 선언 */}
      {answers.firstSprout && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <h2 className="font-serif text-lg font-bold text-emerald-900 mb-2">🌱 첫 싹 선언</h2>
          <p className="text-sm text-emerald-800 leading-relaxed">{answers.firstSprout}</p>
        </div>
      )}

      {/* 액션 */}
      <div className="flex gap-3">
        <Link
          href="/session"
          className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm text-center hover:bg-white transition-colors"
        >
          새 세션
        </Link>
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 hover:bg-ft-ink/90 transition-colors"
        >
          {isDownloading ? 'PDF 생성 중...' : 'PDF 다운로드'}
        </button>
      </div>
    </div>
  );
}

export default function SessionResultPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-10 px-4">
      <div className="max-w-lg mx-auto">
        <Suspense fallback={
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-ft-muted" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }>
          <ResultContent />
        </Suspense>
      </div>
    </div>
  );
}
