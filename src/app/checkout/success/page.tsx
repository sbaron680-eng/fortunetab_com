'use client';

/**
 * /checkout/success
 * 토스페이먼츠 결제 성공 후 redirect되는 페이지
 * URL params: paymentKey, orderId, amount
 *
 * TODO: 서버 측 최종 승인 (Cloudflare Worker)
 *   POST https://api.tosspayments.com/v1/payments/confirm
 *   { paymentKey, orderId, amount }
 *   Authorization: Basic base64(시크릿키:)
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore, useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';

type ConfirmStatus = 'confirming' | 'done' | 'error';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const paymentKey   = searchParams.get('paymentKey') ?? '';
  const orderId      = searchParams.get('orderId') ?? '';
  const amount       = Number(searchParams.get('amount') ?? '0');
  const paymentType  = searchParams.get('paymentType') ?? '';

  const [status, setStatus] = useState<ConfirmStatus>('confirming');
  const [orderNumber, setOrderNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  // clearCart 호출 전에 프리미엄 여부를 스냅샷으로 저장 (리포트 별도 발송 안내 카드용)
  const [hasPremium, setHasPremium] = useState(false);

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setErrorMsg('결제 정보가 올바르지 않습니다.');
      return;
    }

    (async () => {
      try {
        // 토스페이먼츠 결제 최종 승인 (Supabase Edge Function → 토스 API)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const confirmRes = await fetch(`${supabaseUrl}/functions/v1/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
          },
          body: JSON.stringify({ paymentKey, orderId, amount, paymentType }),
        });
        const confirmData = await confirmRes.json();
        if (!confirmData.ok) {
          throw new Error(confirmData.error || '결제 승인에 실패했습니다.');
        }

        // 명발굴 세션 결제 처리 — 결제 완료 후 wizard로 복귀하여 AI 생성 진행
        const pendingSession = typeof window !== 'undefined'
          ? JSON.parse(sessionStorage.getItem('ft_pending_session') || 'null')
          : null;

        if (pendingSession) {
          // ft_pending_session은 유지 — StepPaywall에서 감지하여 다음 단계로 진행
          // isPaid 플래그를 sessionStorage에 추가
          sessionStorage.setItem('ft_paid', 'true');
          clearCart();
          router.push('/session/wizard');
          return;
        }

        // fortune 단건 구매 처리
        const fortuneCheckout = typeof window !== 'undefined'
          ? JSON.parse(sessionStorage.getItem('fortune-checkout') || 'null')
          : null;

        if (fortuneCheckout && user) {
          await supabase.from('fortune_purchases').insert({
            user_id: user.id,
            type: fortuneCheckout.fortuneType,
            order_id: orderId,
          });
          sessionStorage.removeItem('fortune-checkout');
          router.push(`/fortune?type=${fortuneCheckout.fortuneType}`);
          return;
        }

        // 카트 기반 일반 주문 — 이미 /checkout에서 pending 상태로 DB에 생성되어 있고,
        // confirm-payment가 status를 'paid'로 전환하며 send-order-email을 트리거함.
        // clearCart 전에 프리미엄 포함 여부 스냅샷 (리포트 별도 발송 안내용)
        setHasPremium(items.some((i) => i.product.slug === 'saju-planner-premium'));
        sessionStorage.removeItem('checkout-form');
        clearCart();
        setOrderNumber(orderId);
        setStatus('done');
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : '결제 확인 중 오류가 발생했습니다.');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentKey, orderId, amount]);

  if (status === 'confirming') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <svg className="animate-spin w-8 h-8 text-ft-ink" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-ft-muted text-sm">결제를 확인하는 중입니다…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">결제 확인 오류</h2>
        <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
        <Link
          href="/checkout"
          className="inline-block px-6 py-3 bg-ft-ink text-white rounded-xl text-sm font-medium hover:bg-ft-ink-mid transition-colors"
        >
          다시 시도하기
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-emerald-100 rounded-full">
        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>

      <h1 className="text-2xl font-black font-serif text-ft-ink mb-2">결제가 완료되었습니다!</h1>
      <p className="text-gray-500 text-sm mb-1">
        주문번호: <span className="font-medium text-gray-700">{orderNumber || orderId}</span>
      </p>
      <p className="text-gray-500 text-sm mb-2">
        결제금액: <span className="font-medium text-gray-700">{paymentType === 'PAYPAL' ? `$${amount}` : `₩${amount.toLocaleString('ko-KR')}`}</span>
      </p>

      <div className="mt-6 bg-indigo-50 rounded-2xl p-4 text-left text-sm text-gray-600 space-y-2 border border-indigo-100">
        <p>📊 대시보드에서 결과 확인 및 PDF 다운로드가 가능합니다.</p>
        <p>📧 플래너 다운로드 링크가 이메일로 발송됩니다.</p>
        <p>💬 문의: <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">sbaron680@gmail.com</a></p>
      </div>

      {hasPremium && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
          <p className="text-sm font-bold text-ft-ink mb-1.5">
            📖 사주 심층 리포트는 별도로 발송됩니다
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">
            프리미엄 구매 고객님께는 <b>결제일로부터 14일 이내</b>에 사주 구조·10년 대운·월별 세운이 담긴 심층 리포트 PDF를 이메일로 별도 발송해드립니다.
            <br />
            <span className="text-[11px] text-amber-700">
              ⏳ 리포트 기능은 현재 개발 중으로, 얼리버드 고객에게 무료 업데이트로 제공됩니다.
            </span>
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="block w-full py-3.5 font-bold text-ft-ink bg-ft-gold rounded-xl hover:bg-ft-gold-h transition-colors text-center"
        >
          대시보드에서 확인하기
        </Link>
        <Link
          href="/products"
          className="block w-full py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          다른 플래너 보기
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center py-20 px-4">
      <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-10 max-w-md w-full">
        <Suspense fallback={
          <div className="flex justify-center py-16">
            <svg className="animate-spin w-6 h-6 text-ft-muted" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
