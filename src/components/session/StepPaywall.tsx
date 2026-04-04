'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
import { useAuthStore, useCartStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import type { Product } from '@/types';
import Link from 'next/link';

type AccessType = 'subscription' | 'credits' | 'none';

export default function StepPaywall() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    mode, fortuneScore, fortunePercent, daunPhase, gradeLabel, answers,
    nextStep, prevStep, setPaid,
  } = useSessionStore();

  const [accessType, setAccessType] = useState<AccessType>('none');
  const [isAccessLoading, setIsAccessLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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

  // 결제 완료 후 돌아왔는지 확인 (sessionStorage)
  useEffect(() => {
    const paid = sessionStorage.getItem('ft_paid');
    if (paid) {
      sessionStorage.removeItem('ft_paid');
      sessionStorage.removeItem('ft_pending_session');
      setPaid(true);
      nextStep();
    }
  }, [setPaid, nextStep]);

  // 비로그인
  if (!user) {
    return (
      <div className="bg-white border border-ft-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-2">
          로그인이 필요합니다
        </h2>
        <p className="text-sm text-ft-muted mb-6 leading-relaxed">
          AI 분석 결과를 받으려면 로그인해 주세요.<br />
          입력한 내용은 로그인 후에도 유지됩니다.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={prevStep}
            className="px-6 py-2 rounded-xl border border-ft-border text-ft-muted text-sm font-medium hover:bg-ft-paper transition-colors"
          >
            이전
          </button>
          <Link
            href="/auth/login"
            className="px-6 py-2 rounded-xl bg-ft-ink text-white text-sm font-medium hover:bg-ft-ink/90 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  async function handleProceed() {
    setIsProcessing(true);

    try {
      if (accessType === 'subscription') {
        setPaid(true);
        nextStep();
      } else if (accessType === 'credits') {
        // 포인트 차감
        const { data: credit } = await supabase
          .from('credits')
          .select('balance')
          .eq('user_id', user!.id)
          .eq('service', 'ft')
          .single();

        if (credit && credit.balance > 0) {
          await supabase
            .from('credits')
            .update({ balance: credit.balance - 1 })
            .eq('user_id', user!.id)
            .eq('service', 'ft');

          setPaid(true);
          nextStep();
        }
      } else {
        // 단건 결제 → 토스 체크아웃
        handleSingleCheckout();
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleSingleCheckout() {
    // 세션 데이터를 임시 저장 (결제 완료 후 복구용)
    sessionStorage.setItem('ft_pending_session', JSON.stringify({
      mode, fortuneScore, fortunePercent, daunPhase, gradeLabel, answers,
    }));

    // 가상 세션 상품을 카트에 추가 후 /checkout 이동
    const { clearCart, addItem } = useCartStore.getState();
    const sessionProduct: Product = {
      id: 'ft-session-single',
      slug: 'ft-session-single',
      name: '명발굴 세션 (1회)',
      subtitle: 'AI 기반 잠재의식 발굴 세션',
      price: 3900,
      originalPrice: null,
      badge: null,
      badgeColor: 'gold',
      images: [],
      thumbnailImage: '',
      shortDescription: '명발굴 세션 단건 결제',
      description: '',
      features: [],
      specs: [],
      downloadUrl: null,
      category: 'basic',
      inStock: true,
      seo: { title: '', description: '', keywords: [] },
    };

    clearCart();
    addItem(sessionProduct);

    setTimeout(() => {
      router.push('/checkout');
    }, 100);
  }

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🔮</div>
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-2">
          AI 분석 준비 완료
        </h2>
        <p className="text-sm text-ft-muted leading-relaxed">
          입력하신 내용을 바탕으로<br />
          Claude AI가 3가지 관점에서 분석합니다
        </p>
      </div>

      {/* 분석 미리보기 */}
      <div className="space-y-2 mb-6">
        {[
          { icon: '📖', title: '운명 흐름', desc: '과거 뿌리 → 현재 갈림길 → 미래 수확' },
          { icon: '🚧', title: '실행 브레이크 진단', desc: '성장목표 / 브레이크행동 / 숨겨진 이유' },
          { icon: '🌱', title: 'GROW 4법 행동 계획', desc: 'Ground / Root / Open / Water' },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-3 bg-ft-paper rounded-xl p-3">
            <span className="text-lg">{item.icon}</span>
            <div>
              <p className="text-sm font-semibold text-ft-ink">{item.title}</p>
              <p className="text-xs text-ft-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 결제 정보 */}
      {isAccessLoading ? (
        <div className="text-center py-4">
          <p className="text-sm text-ft-muted">결제 정보 확인 중...</p>
        </div>
      ) : accessType === 'subscription' ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-6 text-center">
          <p className="text-sm font-medium text-emerald-700">구독 이용 중 — 추가 결제 없이 이용 가능</p>
        </div>
      ) : accessType === 'credits' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-center">
          <p className="text-sm font-medium text-blue-700">크레딧 1회 차감으로 이용 가능</p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-ft-ink">명발굴 세션 (1회)</span>
            <span className="text-lg font-bold text-ft-ink">₩3,900</span>
          </div>
          <p className="text-xs text-ft-muted">
            AI 분석 결과 + GROW 4법 행동 계획 + 세션 저장
          </p>
        </div>
      )}

      {/* 네비게이션 */}
      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm hover:bg-ft-paper transition-colors"
        >
          이전
        </button>
        <button
          onClick={handleProceed}
          disabled={isAccessLoading || isProcessing}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ft-ink/90 transition-colors"
        >
          {isProcessing
            ? '처리 중...'
            : isAccessLoading
              ? '확인 중...'
              : accessType === 'none'
                ? '결제하고 분석 받기 (₩3,900)'
                : 'AI 분석 시작'}
        </button>
      </div>
    </div>
  );
}
