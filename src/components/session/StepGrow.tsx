'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

const GROW_LABELS = [
  { key: 'ground', letter: 'G', name: 'Ground', desc: '지금 바로 땅에 심을 수 있는 행동', color: 'bg-emerald-50 border-emerald-200' },
  { key: 'root', letter: 'R', name: 'Root', desc: '뿌리를 내리는 꾸준한 행동', color: 'bg-amber-50 border-amber-200' },
  { key: 'open', letter: 'O', name: 'Open', desc: '새로운 가능성을 여는 행동', color: 'bg-blue-50 border-blue-200' },
  { key: 'water', letter: 'W', name: 'Water', desc: '지속적으로 물주는 습관', color: 'bg-cyan-50 border-cyan-200' },
] as const;

export default function StepGrow() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    mode, fortuneScore, daunPhase, answers, result,
    setAnswer, setSessionId, prevStep,
  } = useSessionStore();
  const [isSaving, setIsSaving] = useState(false);

  if (!result) return null;

  const canFinish = answers.firstSprout.trim().length >= 5;

  async function handleFinish() {
    if (!result) return;
    setIsSaving(true);

    try {
      if (user) {
        // 결제는 StepPaywall에서 이미 완료됨 — DB 저장만 수행
        const { data, error } = await supabase
          .from('ft_sessions')
          .insert({
            user_id: user.id,
            mode: mode ?? 'gen',
            fortune_score: fortuneScore,
            daun_phase: daunPhase,
            answers: {
              step1: answers.step1,
              step2: answers.step2,
              step3: answers.step3,
              step4Brake: answers.step4Brake,
              firstSprout: answers.firstSprout,
            },
            result: {
              story: result.story,
              actions: result.actions,
              brake: result.brake,
            },
            payment_type: 'single',
          })
          .select('id')
          .single();

        if (!error && data) {
          setSessionId(data.id);
          router.push(`/session/result?id=${data.id}`);
        } else {
          router.push('/session/result');
        }
      } else {
        router.push('/session/result');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-6">
      <h2 className="font-serif text-lg font-bold text-ft-ink mb-1">GROW 4법 — 뿌리 행동</h2>
      <p className="text-sm text-ft-muted mb-6">AI가 제안한 구체적인 행동 계획입니다</p>

      {/* GROW 4법 카드 */}
      <div className="space-y-3 mb-8">
        {GROW_LABELS.map((g) => (
          <div key={g.key} className={`rounded-xl p-4 border ${g.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 rounded-full bg-ft-ink text-white text-xs font-bold flex items-center justify-center">
                {g.letter}
              </span>
              <span className="text-xs font-semibold text-ft-ink">{g.name} — {g.desc}</span>
            </div>
            <p className="text-sm text-ft-ink/80 leading-relaxed ml-8">
              {result.actions[g.key as keyof typeof result.actions]}
            </p>
          </div>
        ))}
      </div>

      {/* 첫 싹 선언 */}
      <div className="bg-ft-paper rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-sm text-ft-ink mb-2">
          🌱 첫 싹 선언 (First Sprout)
        </h3>
        <p className="text-xs text-ft-muted mb-3">
          위 행동 중 오늘 당장 시작할 한 가지를 선언하세요
        </p>
        <textarea
          value={answers.firstSprout}
          onChange={(e) => setAnswer('firstSprout', e.target.value)}
          placeholder="예: 오늘 저녁 기존 고객 한 명에게 안부 메시지를 보내겠습니다"
          rows={3}
          className="w-full border border-ft-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ft-ink/20 placeholder:text-ft-muted/50"
        />
        {answers.firstSprout.trim().length < 5 && (
          <p className="text-xs text-ft-muted mt-1">최소 5자 이상</p>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm hover:bg-ft-paper transition-colors"
        >
          이전
        </button>
        <button
          onClick={handleFinish}
          disabled={!canFinish || isSaving}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ft-ink/90 transition-colors"
        >
          {isSaving ? '저장 중...' : '세션 완료'}
        </button>
      </div>
    </div>
  );
}
