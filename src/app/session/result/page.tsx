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
    <div className="space-y-6 animate-fade-in">
      {/* 헤더 */}
      <div className="bg-white border border-ft-border rounded-2xl p-8 text-center shadow-sm">
        <div className="inline-flex items-center gap-2 bg-ft-gold/10 text-ft-gold px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-4">
          세션 완료
        </div>
        <h1 className="font-serif text-2xl font-bold text-ft-ink mb-3">
          명발굴 세션 결과
        </h1>
        <p className="text-sm text-ft-muted mb-5">
          {mode === 'biz' ? '💼 1인 사업가' : '🌱 일반'} 모드
        </p>
        <div className="inline-flex items-center gap-3 bg-ft-paper-alt rounded-xl px-5 py-3 text-sm">
          <div className="text-center">
            <p className="text-[10px] text-ft-muted uppercase tracking-wider mb-0.5">Fortune</p>
            <p className="font-bold text-ft-ink text-lg">{fortunePercent}</p>
          </div>
          <div className="w-px h-8 bg-ft-border" />
          <div className="text-center">
            <p className="text-[10px] text-ft-muted uppercase tracking-wider mb-0.5">대운</p>
            <p className="font-bold text-ft-ink text-lg">{daunPhase}</p>
          </div>
          <div className="w-px h-8 bg-ft-border" />
          <div className="text-center">
            <p className="text-[10px] text-ft-muted uppercase tracking-wider mb-0.5">등급</p>
            <p className="font-bold text-ft-ink text-lg">{gradeLabel}</p>
          </div>
        </div>
      </div>

      {/* 3구간 스토리 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-ft-gold" />
          <h2 className="font-serif text-lg font-bold text-ft-ink">운명 흐름</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: '과거 뿌리', text: result.story.pastRoot, icon: '🌱' },
            { label: '현재 갈림길', text: result.story.presentCrossroad, icon: '🔀' },
            { label: '미래 수확', text: result.story.futureHarvest, icon: '🌾' },
          ].map((s) => (
            <div key={s.label} className="hover-lift bg-ft-paper rounded-xl p-5 border border-ft-border/50">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-lg">{s.icon}</span>
                <span className="text-xs font-bold text-ft-ink tracking-wide">{s.label}</span>
              </div>
              <p className="text-sm text-ft-ink/80 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 실행 브레이크 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-ft-red" />
          <h2 className="font-serif text-lg font-bold text-ft-ink">실행 브레이크 진단</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: '성장 목표', text: result.brake.growthGoal, num: '01' },
            { label: '브레이크 행동', text: result.brake.brakeAction, num: '02' },
            { label: '숨겨진 이유', text: result.brake.hiddenReason, num: '03' },
            { label: '핵심 믿음', text: result.brake.coreBelief, num: '04' },
          ].map((s) => (
            <div key={s.label} className="hover-lift bg-ft-paper rounded-xl p-4 border border-ft-border/50">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-ft-muted">{s.num}</span>
                <p className="text-xs font-bold text-ft-ink">{s.label}</p>
              </div>
              <p className="text-sm text-ft-ink/80 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* GROW 4법 */}
      <div className="bg-white border border-ft-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-5 rounded-full bg-ft-navy" />
          <h2 className="font-serif text-lg font-bold text-ft-ink">GROW 4법 행동</h2>
        </div>
        <div className="space-y-3">
          {[
            { letter: 'G', name: 'Ground', text: result.actions.ground, desc: '지금 바로 심기' },
            { letter: 'R', name: 'Root', text: result.actions.root, desc: '뿌리 내리기' },
            { letter: 'O', name: 'Open', text: result.actions.open, desc: '가능성 열기' },
            { letter: 'W', name: 'Water', text: result.actions.water, desc: '꾸준히 물주기' },
          ].map((g) => (
            <div key={g.letter} className="hover-lift flex gap-4 items-start bg-ft-paper rounded-xl p-4 border border-ft-border/50">
              <div className="shrink-0 text-center">
                <span className="w-9 h-9 rounded-full bg-ft-ink text-white text-sm font-bold flex items-center justify-center shadow-sm">
                  {g.letter}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <p className="text-sm font-bold text-ft-ink">{g.name}</p>
                  <p className="text-[10px] text-ft-muted">{g.desc}</p>
                </div>
                <p className="text-sm text-ft-ink/80 leading-relaxed">{g.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 첫 싹 선언 */}
      {answers.firstSprout && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🌱</span>
            <h2 className="font-serif text-lg font-bold text-emerald-900">첫 싹 선언</h2>
          </div>
          <p className="text-sm text-emerald-800 leading-relaxed bg-white/60 rounded-xl p-4 border border-emerald-100">{answers.firstSprout}</p>
        </div>
      )}

      {/* 액션 */}
      <div className="flex gap-3 pt-2">
        <Link
          href="/session"
          className="hover-lift btn-press flex-1 py-3.5 rounded-xl border-2 border-ft-border text-ft-ink font-semibold text-sm text-center bg-white hover:border-ft-muted hover:shadow-sm transition-all"
        >
          새 세션
        </Link>
        <button
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="hover-lift btn-press flex-1 py-3.5 rounded-xl bg-ft-ink text-white font-bold text-sm shadow-lg disabled:opacity-40 disabled:shadow-none hover:bg-ft-ink/90 hover:shadow-xl transition-all"
        >
          {isDownloading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              PDF 생성 중...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              PDF 다운로드
            </span>
          )}
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
