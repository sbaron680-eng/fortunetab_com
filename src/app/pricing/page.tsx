'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ─── 요금제 데이터 ──────────────────────────────────────────────────

interface Plan {
  id: 'single' | 'points' | 'monthly' | 'yearly';
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  badge?: string;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'single',
    name: '단건',
    price: '₩3,900',
    priceNote: '1세션',
    description: '한 번만 체험하고 싶을 때',
    features: [
      '명발굴 세션 1회',
      'AI 3역할 분석 (운명 흐름 + 브레이크 + GROW 4법)',
      'PDF 리포트 다운로드',
    ],
  },
  {
    id: 'points',
    name: '포인트팩',
    price: '₩9,900',
    priceNote: '5포인트',
    description: '필요할 때마다 사용',
    features: [
      '5포인트 (세션 5회분)',
      '유효기간 6개월',
      'PDF 리포트 다운로드',
      '세션 히스토리 30일 보관',
    ],
    badge: '20% 절약',
  },
  {
    id: 'monthly',
    name: '월 구독',
    price: '₩9,900',
    priceNote: '/ 월',
    description: '정기적으로 점검하고 싶을 때',
    features: [
      '무제한 명발굴 세션',
      'PDF 리포트 무제한 다운로드',
      '세션 히스토리 무제한 보관',
      '사주 연간 리포트',
    ],
    highlight: true,
    badge: '추천',
  },
  {
    id: 'yearly',
    name: '연 구독',
    price: '₩79,000',
    priceNote: '/ 년',
    description: '2개월 무료 — 가장 합리적인 선택',
    features: [
      '무제한 명발굴 세션',
      'PDF 리포트 무제한 다운로드',
      '세션 히스토리 무제한 보관',
      '사주 연간 리포트',
      '월 ₩6,583 (2개월 무료)',
    ],
    badge: '최저가',
  },
];

// ─── 페이지 ──────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSelect(planId: Plan['id']) {
    if (!user) return;

    setLoadingPlan(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('로그인이 필요합니다');

      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!res.ok) throw new Error('결제 페이지 생성 실패');
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      // 에러 처리는 간단히
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl font-bold text-ft-ink mb-3">
            명발굴 세션 요금제
          </h1>
          <p className="text-ft-muted text-sm max-w-md mx-auto">
            막혔을 때, 내 안의 답을 꺼내는 AI 발굴 세션.<br />
            나에게 맞는 플랜을 선택하세요.
          </p>
        </div>

        {/* 요금제 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl p-6 flex flex-col ${
                plan.highlight
                  ? 'border-2 border-ft-ink shadow-lg'
                  : 'border border-ft-border'
              }`}
            >
              {/* 배지 */}
              {plan.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold ${
                    plan.highlight
                      ? 'bg-ft-ink text-white'
                      : 'bg-ft-paper text-ft-ink border border-ft-border'
                  }`}
                >
                  {plan.badge}
                </span>
              )}

              {/* 플랜 정보 */}
              <h3 className="font-semibold text-ft-ink text-lg mb-1 mt-2">{plan.name}</h3>
              <p className="text-xs text-ft-muted mb-4">{plan.description}</p>

              <div className="mb-5">
                <span className="text-2xl font-bold text-ft-ink">{plan.price}</span>
                <span className="text-sm text-ft-muted ml-1">{plan.priceNote}</span>
              </div>

              {/* 기능 목록 */}
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ft-ink/80">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {user ? (
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 ${
                    plan.highlight
                      ? 'bg-ft-ink text-white hover:bg-ft-ink/90'
                      : 'bg-ft-paper text-ft-ink border border-ft-border hover:bg-ft-border/30'
                  }`}
                >
                  {loadingPlan === plan.id ? '처리 중...' : '선택하기'}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  className={`w-full py-3 rounded-xl font-semibold text-sm text-center block transition-colors ${
                    plan.highlight
                      ? 'bg-ft-ink text-white hover:bg-ft-ink/90'
                      : 'bg-ft-paper text-ft-ink border border-ft-border hover:bg-ft-border/30'
                  }`}
                >
                  로그인 후 선택
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* 하단 안내 */}
        <div className="mt-12 text-center text-xs text-ft-muted space-y-1">
          <p>결제는 토스페이먼츠(국내) 및 Lemon Squeezy(글로벌)를 통해 안전하게 처리됩니다.</p>
          <p>구독은 언제든 해지할 수 있으며, 해지 후에도 현재 결제 기간까지 이용 가능합니다.</p>
          <p>
            <Link href="/refund" className="underline">환불 정책</Link>
            {' · '}
            <Link href="/terms" className="underline">이용약관</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
