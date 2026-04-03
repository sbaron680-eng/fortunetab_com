'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { PaymentType } from '@/lib/supabase';

const GROW_LABELS = [
  { key: 'ground', letter: 'G', name: 'Ground', desc: '지금 바로 땅에 심을 수 있는 행동', color: 'bg-emerald-50 border-emerald-200' },
  { key: 'root', letter: 'R', name: 'Root', desc: '뿌리를 내리는 꾸준한 행동', color: 'bg-amber-50 border-amber-200' },
  { key: 'open', letter: 'O', name: 'Open', desc: '새로운 가능성을 여는 행동', color: 'bg-blue-50 border-blue-200' },
  { key: 'water', letter: 'W', name: 'Water', desc: '지속적으로 물주는 습관', color: 'bg-cyan-50 border-cyan-200' },
] as const;

type AccessType = 'subscription' | 'credits' | 'none';

export default function StepGrow() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    mode, fortuneScore, daunPhase, answers, result,
    setAnswer, setSessionId, prevStep,
  } = useSessionStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [accessType, setAccessType] = useState<AccessType>('none');
  const [isAccessLoading, setIsAccessLoading] = useState(true);

  // 결제 상태 확인: 구독 or 포인트 보유 여부
  useEffect(() => {
    if (!user) { setIsAccessLoading(false); return; }

    async function checkAccess() {
      // 1. 활성 구독 확인
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user!.id)
        .eq('service', 'ft')
        .eq('status', 'active')
        .maybeSingle();

      if (sub) { setAccessType('subscription'); setIsAccessLoading(false); return; }

      // 2. 크레딧 잔액 확인
      const { data: credit } = await supabase
        .from('credits')
        .select('balance, expires_at')
        .eq('user_id', user!.id)
        .eq('service', 'ft')
        .maybeSingle();

      if (credit && credit.balance > 0 && (!credit.expires_at || new Date(credit.expires_at) > new Date())) {
        setAccessType('credits');
        setIsAccessLoading(false);
        return;
      }

      setAccessType('none');
      setIsAccessLoading(false);
    }

    checkAccess();
  }, [user]);

  if (!result) return null;

  const canFinish = answers.firstSprout.trim().length >= 5;

  async function saveSession(paymentType: PaymentType) {
    if (!result || !user) return;

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
        payment_type: paymentType,
      })
      .select('id')
      .single();

    if (!error && data) {
      setSessionId(data.id);
      return data.id;
    }
    return null;
  }

  async function handleFinish() {
    if (!result) return;
    setIsSaving(true);

    try {
      if (!user) {
        // 비로그인 — 결과 페이지만 (저장/PDF 불가)
        router.push('/session/result');
        return;
      }

      if (accessType === 'subscription') {
        // 구독 사용자 — 바로 저장
        const sessionId = await saveSession('subscription');
        router.push(sessionId ? `/session/result?id=${sessionId}` : '/session/result');
      } else if (accessType === 'credits') {
        // 포인트 차감 후 저장
        const { data: credit } = await supabase
          .from('credits')
          .select('balance')
          .eq('user_id', user.id)
          .eq('service', 'ft')
          .single();

        if (credit && credit.balance > 0) {
          await supabase
            .from('credits')
            .update({ balance: credit.balance - 1 })
            .eq('user_id', user.id)
            .eq('service', 'ft');

          const sessionId = await saveSession('credit');
          router.push(sessionId ? `/session/result?id=${sessionId}` : '/session/result');
        }
      } else {
        // 단건 결제 — LS Checkout으로 이동
        await handleSingleCheckout();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSingleCheckout() {
    setIsCheckingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: 'single' }),
      });

      if (!res.ok) throw new Error('결제 페이지 생성 실패');
      const { url } = await res.json();

      // 세션 데이터를 임시 저장 (결제 완료 후 복구용)
      sessionStorage.setItem('ft_pending_session', JSON.stringify({
        mode, fortuneScore, daunPhase, answers, result,
      }));

      window.location.href = url;
    } finally {
      setIsCheckingOut(false);
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
          disabled={!canFinish || isSaving || isCheckingOut || isAccessLoading}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ft-ink/90 transition-colors"
        >
          {isSaving || isCheckingOut
            ? '처리 중...'
            : isAccessLoading
              ? '확인 중...'
              : accessType === 'none' && user
                ? '결제 후 결과 보기 (₩3,900)'
                : '세션 완료'}
        </button>
      </div>
    </div>
  );
}
