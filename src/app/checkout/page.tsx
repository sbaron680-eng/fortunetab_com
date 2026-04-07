'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore, useAuthStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { usePromotions } from '@/lib/usePromotions';
import { createOrder } from '@/lib/orders';
import dynamic from 'next/dynamic';
import type { PaymentWidgetHandle } from '@/components/checkout/PaymentWidget';
import type { PayPalPaymentWidgetHandle } from '@/components/checkout/PayPalPaymentWidget';

const PaymentWidget = dynamic(
  () => import('@/components/checkout/PaymentWidget'),
  { ssr: false }
);

const PayPalPaymentWidget = dynamic(
  () => import('@/components/checkout/PayPalPaymentWidget'),
  { ssr: false }
);

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? '';

// ── Fortune 단건 상품 정의 ──────────────────────────────────────────
const FORTUNE_PRODUCTS: Record<string, {
  name: string; nameEn: string;
  amount: number; usdAmount: number;
  type: 'saju' | 'astrology' | 'couple';
}> = {
  'fortune-saju':      { name: 'AI 사주 분석 1회',   nameEn: 'AI Saju Analysis',          amount: 3900, usdAmount: 2.99, type: 'saju' },
  'fortune-astrology': { name: 'AI 별자리 분석 1회', nameEn: 'AI Astrology Analysis',    amount: 2900, usdAmount: 1.99, type: 'astrology' },
  'fortune-couple':    { name: 'AI 궁합 분석 1회',   nameEn: 'AI Compatibility Analysis', amount: 3900, usdAmount: 2.99, type: 'couple' },
};

const TOSS_PAYPAL_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_PAYPAL_CLIENT_KEY ?? '';

type Step = 'info' | 'payment' | 'complete';

interface OrderForm {
  name: string;
  email: string;
  phone: string;
  // 사주 플래너용 추가 정보
  birthDate: string;
  birthTime: string;
  birthGender: string;
  notes: string;
}

interface InfoErrors {
  name?: string;
  email?: string;
  phone?: string;
}

const BIRTH_TIMES = [
  { value: '', label: '모름 (생략 가능)' },
  { value: '자시', label: '자시 (23:00 – 01:00)' },
  { value: '축시', label: '축시 (01:00 – 03:00)' },
  { value: '인시', label: '인시 (03:00 – 05:00)' },
  { value: '묘시', label: '묘시 (05:00 – 07:00)' },
  { value: '진시', label: '진시 (07:00 – 09:00)' },
  { value: '사시', label: '사시 (09:00 – 11:00)' },
  { value: '오시', label: '오시 (11:00 – 13:00)' },
  { value: '미시', label: '미시 (13:00 – 15:00)' },
  { value: '신시', label: '신시 (15:00 – 17:00)' },
  { value: '유시', label: '유시 (17:00 – 19:00)' },
  { value: '술시', label: '술시 (19:00 – 21:00)' },
  { value: '해시', label: '해시 (21:00 – 23:00)' },
];

export default function CheckoutPage() {
  const { items, totalPrice: cartTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { getPromo } = usePromotions();

  const paymentWidgetRef = useRef<PaymentWidgetHandle>(null);

  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeError, setAgreeError] = useState('');
  const [infoErrors, setInfoErrors] = useState<InfoErrors>({});
  const [widgetReady, setWidgetReady] = useState(false);

  // fortune 단건 결제 감지
  const [fortuneProduct, setFortuneProduct] = useState<string | null>(null);
  const fortuneInfo = fortuneProduct ? FORTUNE_PRODUCTS[fortuneProduct] : null;

  // PayPal 결제
  const [paymentMethod, setPaymentMethod] = useState<'domestic' | 'paypal'>('domestic');
  const paypalWidgetRef = useRef<PayPalPaymentWidgetHandle>(null);
  const [paypalWidgetReady, setPaypalWidgetReady] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const [form, setForm] = useState<OrderForm>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
    birthDate: user?.birthDate ?? '',
    birthTime: user?.birthHour ?? '',
    birthGender: user?.gender ?? '',
    notes: '',
  });

  useEffect(() => {
    setMounted(true);
    // ?product=fortune-saju 감지
    const params = new URLSearchParams(window.location.search);
    const product = params.get('product');
    if (product && FORTUNE_PRODUCTS[product]) {
      setFortuneProduct(product);
    }
  }, []);

  // user 로딩 후 사주 정보 자동 입력 (프로필에 저장된 값 우선)
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        birthDate: prev.birthDate || user.birthDate || '',
        birthTime: prev.birthTime || user.birthHour || '',
        birthGender: prev.birthGender || user.gender || '',
      }));
    }
  }, [user]);

  // 사주 플래너 포함 여부 확인 (사주 입력이 필요한 상품만)
  const SAJU_SLUGS = ['saju-planner-basic', 'saju-planner-premium'];
  const hasSajuProduct = items.some(
    (i) => SAJU_SLUGS.includes(i.product.slug)
  );
  const getItemPrice = (slug: string, basePrice: number) => {
    const promo = getPromo(slug, basePrice);
    return promo.hasPromo ? promo.finalPrice : basePrice;
  };
  const total = items.reduce((sum, i) => sum + getItemPrice(i.product.slug, i.product.price) * i.qty, 0);
  const totalUsd = Math.round(total / 1350 * 100) / 100; // KRW → USD 근사 환산
  const hasPaidItem = items.some((i) => getItemPrice(i.product.slug, i.product.price) > 0);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleInfoSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: InfoErrors = {};
    if (!form.name.trim()) {
      newErrors.name = '이름을 입력해 주세요';
    }
    if (!form.email.trim()) {
      newErrors.email = '이메일을 입력해 주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '올바른 이메일 주소를 입력해 주세요';
    }
    if (hasPaidItem && !form.phone.trim()) {
      newErrors.phone = '유료 상품 구매 시 연락처를 입력해 주세요';
    }
    setInfoErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePayment = async () => {
    if (!agreeTerms) {
      setAgreeError('이용약관 및 개인정보 처리방침에 동의해 주세요.');
      return;
    }
    setAgreeError('');
    setPaymentError('');

    setIsSubmitting(true);

    try {
      if (!hasPaidItem) {
        // 무료 상품: 주문 저장 후 이메일 발송 (Toss 결제 불필요)
        await new Promise((resolve) => setTimeout(resolve, 800));
        let orderNum = `FT-FREE-${Date.now()}`;
        if (user) {
          const sajuData = hasSajuProduct ? {
            name: form.name,
            email: form.email,
            birthDate: form.birthDate,
            birthTime: form.birthTime,
            birthGender: form.birthGender,
            theme: 'navy',
            orientation: 'portrait',
            notes: form.notes,
          } : undefined;
          const result = await createOrder(user.id, items, 0, sajuData);
          if (result) orderNum = result.orderNumber;
        }
        setOrderNumber(orderNum);
        clearCart();
        setStep('complete');
        return;
      }

      // 토스페이먼츠 결제 요청 (성공 시 /checkout/success로 redirect)
      // 토스 리디렉트 전 폼 데이터 임시 저장
      sessionStorage.setItem('checkout-form', JSON.stringify(form));

      const orderId = `FT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const orderName = items.map((i) => i.product.name).join(', ');

      if (paymentMethod === 'paypal') {
        if (!paypalWidgetRef.current) {
          setPaymentError('PayPal 위젯이 준비되지 않았습니다. 페이지를 새로고침해 주세요.');
          return;
        }
        console.log('[Checkout] PayPal requestPayment 호출 시작', { orderId, orderName, totalUsd });
        await paypalWidgetRef.current.requestPayment({
          orderId,
          orderName,
          customerName: form.name,
          customerEmail: form.email,
          product: { name: orderName, unitAmount: totalUsd },
        });
        console.log('[Checkout] PayPal requestPayment 완료 (리다이렉트 안됨)');
      } else {
        await paymentWidgetRef.current!.requestPayment({
          orderId,
          orderName,
          customerName: form.name,
          customerEmail: form.email,
          customerMobilePhone: form.phone.replace(/[^0-9]/g, '') || undefined,
        });
      }
      // requestPayment()는 페이지를 이동시키므로 아래 코드는 실행되지 않습니다
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Checkout] 결제 요청 실패:', msg, err);
      setPaymentError(`결제 처리 중 오류: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Fortune 단건 결제 핸들러 ─────────────────────
  const handleFortunePayment = async () => {
    if (!fortuneInfo) return;
    if (!agreeTerms) {
      setAgreeError('이용약관 및 개인정보 처리방침에 동의해 주세요.');
      return;
    }
    setAgreeError('');
    setPaymentError('');
    setIsSubmitting(true);
    try {
      sessionStorage.setItem('fortune-checkout', JSON.stringify({
        fortuneType: fortuneInfo.type,
        product: fortuneProduct,
        paymentMethod,
      }));

      const orderId = `FORTUNE-${fortuneInfo.type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

      if (paymentMethod === 'paypal') {
        if (!paypalWidgetRef.current) {
          setPaymentError('PayPal 위젯이 준비되지 않았습니다. 페이지를 새로고침해 주세요.');
          return;
        }
        console.log('[Fortune] PayPal requestPayment 호출 시작', { orderId, fortuneInfo });
        await paypalWidgetRef.current.requestPayment({
          orderId,
          orderName: fortuneInfo.nameEn,
          customerName: user?.name ?? 'User',
          customerEmail: user?.email ?? '',
          product: { name: fortuneInfo.nameEn, unitAmount: fortuneInfo.usdAmount },
        });
        console.log('[Fortune] PayPal requestPayment 완료 (리다이렉트 안됨)');
      } else {
        await paymentWidgetRef.current!.requestPayment({
          orderId,
          orderName: fortuneInfo.name,
          customerName: user?.name ?? '사용자',
          customerEmail: user?.email ?? '',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Fortune] 결제 요청 실패:', msg, err);
      setPaymentError(`결제 처리 중 오류: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Fortune 단건 결제 UI ───────────────────────
  if (mounted && fortuneInfo) {
    if (!user) {
      return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-ft-ink mb-2">로그인이 필요합니다</h1>
          <p className="text-sm text-ft-muted mb-6">AI 운세 분석을 구매하려면 로그인해 주세요.</p>
          <Link
            href={`/auth/login?next=/checkout?product=${fortuneProduct}`}
            className="px-8 py-3 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink-mid transition-colors"
          >
            로그인하기
          </Link>
        </div>
      );
    }

    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6 animate-fade-in">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-black font-serif text-ft-ink mb-6">AI 운세 결제</h1>

          {/* 상품 요약 */}
          <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center bg-amber-50 rounded-xl text-2xl">✨</div>
              <div className="flex-1">
                <p className="font-bold text-ft-ink">
                  {paymentMethod === 'paypal' ? fortuneInfo.nameEn : fortuneInfo.name}
                </p>
                <p className="text-xs text-ft-muted">1회 이용권 · Claude AI 심층 분석</p>
              </div>
              <p className="text-lg font-black text-ft-ink">
                {paymentMethod === 'paypal' ? `$${fortuneInfo.usdAmount}` : formatPrice(fortuneInfo.amount)}
              </p>
            </div>
          </div>

          {/* 결제수단 선택 (PayPal 키가 있을 때만 토글 표시) */}
          {TOSS_PAYPAL_CLIENT_KEY && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setPaymentMethod('domestic'); setWidgetReady(false); setPaypalWidgetReady(false); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                  paymentMethod === 'domestic'
                    ? 'bg-ft-ink text-white border-ft-ink'
                    : 'bg-white text-ft-muted border-ft-border hover:border-ft-ink'
                }`}
              >
                국내 결제 {formatPrice(fortuneInfo.amount)}
              </button>
              <button
                onClick={() => { setPaymentMethod('paypal'); setWidgetReady(false); setPaypalWidgetReady(false); }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                  paymentMethod === 'paypal'
                    ? 'bg-[#0070ba] text-white border-[#0070ba]'
                    : 'bg-white text-ft-muted border-ft-border hover:border-[#0070ba]'
                }`}
              >
                PayPal ${fortuneInfo.usdAmount}
              </button>
            </div>
          )}

          {/* 결제 위젯 */}
          <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 mb-4">
            <h2 className="font-bold font-serif text-ft-ink mb-4">
              {paymentMethod === 'paypal' ? '🌐 PayPal' : '💳 결제 수단'}
            </h2>
            {paymentMethod === 'domestic' ? (
              <PaymentWidget
                ref={paymentWidgetRef}
                clientKey={TOSS_CLIENT_KEY}
                customerKey={user.id}
                amount={fortuneInfo.amount}
                onReady={() => setWidgetReady(true)}
                onError={(err) => console.error('[Fortune] 결제위젯 에러:', err)}
              />
            ) : (
              <PayPalPaymentWidget
                ref={paypalWidgetRef}
                clientKey={TOSS_PAYPAL_CLIENT_KEY}
                customerKey={user.id}
                amount={fortuneInfo.usdAmount}
                onReady={() => setPaypalWidgetReady(true)}
              />
            )}
          </div>

          {/* 약관 동의 */}
          <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => {
                  setAgreeTerms(e.target.checked);
                  if (e.target.checked) setAgreeError('');
                }}
                className="mt-0.5 w-4 h-4 rounded border-ft-border text-ft-ink focus:ring-ft-ink flex-shrink-0"
              />
              <span className="text-sm text-gray-600 leading-relaxed">
                <Link href="/terms" target="_blank" className="font-medium text-gray-900 underline hover:text-ft-ink transition-colors">이용약관</Link>,{' '}
                <Link href="/privacy" target="_blank" className="font-medium text-gray-900 underline hover:text-ft-ink transition-colors">개인정보 처리방침</Link>에 동의합니다.
                AI 운세 분석은 명리학의 학문적 관점에서 참고용으로 제공됩니다.
              </span>
            </label>
            {agreeError && (
              <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                <span>⚠</span> {agreeError}
              </p>
            )}
          </div>

          {paymentError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
              <p className="font-medium mb-1">결제 오류</p>
              <p>{paymentError}</p>
            </div>
          )}

          <button
            onClick={handleFortunePayment}
            disabled={isSubmitting || (paymentMethod === 'domestic' ? !widgetReady : !paypalWidgetReady)}
            className={`btn-press w-full py-4 font-bold rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              paymentMethod === 'paypal'
                ? 'text-white bg-[#0070ba] hover:bg-[#005ea6]'
                : 'text-ft-navy bg-ft-gold hover:bg-ft-gold-h'
            }`}
          >
            {isSubmitting && (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isSubmitting
              ? '처리 중...'
              : paymentMethod === 'paypal'
                ? `Pay $${fortuneInfo.usdAmount} with PayPal`
                : `${formatPrice(fortuneInfo.amount)} 결제하기`}
          </button>
        </div>
      </div>
    );
  }

  // ── 로딩 중 ────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper">
        <div className="animate-pulse text-ft-muted">로딩 중...</div>
      </div>
    );
  }

  // ── 빈 카트 ────────────────────────────────────────────
  if (items.length === 0 && step !== 'complete') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in bg-ft-paper">
        <div className="w-24 h-24 mb-6 flex items-center justify-center bg-ft-paper-alt rounded-full">
          <svg className="w-12 h-12 text-ft-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black font-serif text-ft-ink mb-2">장바구니가 비어 있습니다</h1>
        <p className="text-ft-muted mb-8">마음에 드는 플래너를 담아보세요!</p>
        <Link href="/products" className="px-8 py-4 font-bold text-white bg-ft-navy rounded-2xl hover:bg-ft-ink transition-colors shadow-lg hover-lift btn-press">
          상품 보러 가기 →
        </Link>
      </div>
    );
  }

  // ── 주문 완료 ──────────────────────────────────────────
  if (step === 'complete') {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex items-center justify-center py-20 px-4">
        <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-emerald-100 rounded-full">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-black font-serif text-ft-ink mb-2">
            {hasPaidItem ? '결제가 완료되었습니다!' : '신청이 완료되었습니다!'}
          </h1>
          <p className="text-gray-500 text-sm mb-2">주문번호: <span className="font-medium text-gray-700">{orderNumber}</span></p>
          <p className="text-gray-500 text-sm mb-8">
            {hasPaidItem ? (
              <>
                결제가 확인되었습니다.<br />
                아래 버튼을 눌러 지금 바로 PDF를 생성하세요.
              </>
            ) : (
              '아래 버튼을 눌러 지금 바로 PDF를 다운로드하세요.'
            )}
          </p>

          <div className="bg-emerald-50 rounded-2xl p-4 text-left text-sm text-emerald-700 mb-6 space-y-1.5 border border-emerald-200">
            <p className="font-medium">브라우저에서 즉시 PDF가 생성됩니다.</p>
            <p className="text-emerald-600">서버 전송 없이 내 기기에서 바로 다운로드됩니다.</p>
            {hasSajuProduct && (
              <p className="text-emerald-600">🔮 사주 플래너는 /사주 계산기에서 생년월일을 입력하면 개인화됩니다.</p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={
                hasSajuProduct
                  ? `/download?mode=fortune&orderId=${orderNumber}`
                  : '/download'
              }
              className="block w-full py-3.5 font-bold text-ft-navy bg-ft-gold rounded-xl hover:bg-ft-gold-h btn-press transition-colors text-center"
            >
              {hasSajuProduct ? '🔮 지금 바로 사주 플래너 PDF 만들기 →' : 'PDF 다운로드 →'}
            </Link>
            <Link
              href="/"
              className="block w-full text-center py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              홈으로 가기
            </Link>
            <Link
              href="/products"
              className="block w-full py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center"
            >
              다른 플래너 보기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 스텝 인디케이터 ────────────────────────────────────
  const steps = [
    { id: 'info', label: '정보 입력' },
    { id: 'payment', label: '결제' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-ft-ink">결제</h1>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 text-sm font-medium ${
                  step === s.id
                    ? 'text-ft-ink'
                    : step === 'payment' && s.id === 'info'
                    ? 'text-emerald-600'
                    : 'text-ft-muted'
                }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step === s.id
                      ? 'bg-ft-ink text-white'
                      : step === 'payment' && s.id === 'info'
                      ? 'bg-emerald-500 text-white'
                      : 'border border-ft-border text-ft-muted'
                  }`}>
                    {step === 'payment' && s.id === 'info' ? '✓' : idx + 1}
                  </span>
                  {s.label}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-8 h-px bg-gray-300 mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── 메인 폼 영역 ──────────────────────────────── */}
          <div className="lg:col-span-2">

            {/* ── STEP 1: 정보 입력 ──────────────────────── */}
            {step === 'info' && (
              <form onSubmit={handleInfoSubmit} noValidate className="space-y-4">
                {/* 기본 정보 */}
                <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 sm:p-6">
                  <h2 className="font-bold font-serif text-ft-ink mb-4">📋 주문자 정보</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이름 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleFormChange}
                        onBlur={() => {
                          if (!form.name.trim()) {
                            setInfoErrors((prev) => ({ ...prev, name: '이름을 입력해 주세요' }));
                          } else {
                            setInfoErrors((prev) => ({ ...prev, name: undefined }));
                          }
                        }}
                        placeholder="홍길동"
                        className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          infoErrors.name
                            ? 'border-red-400 focus:ring-red-400'
                            : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                        }`}
                      />
                      {infoErrors.name && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {infoErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        연락처{hasPaidItem && <span className="text-red-500"> *</span>}
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleFormChange}
                        onBlur={() => {
                          if (hasPaidItem && !form.phone.trim()) {
                            setInfoErrors((prev) => ({ ...prev, phone: '유료 상품 구매 시 연락처를 입력해 주세요' }));
                          } else {
                            setInfoErrors((prev) => ({ ...prev, phone: undefined }));
                          }
                        }}
                        placeholder="010-0000-0000"
                        className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          infoErrors.phone
                            ? 'border-red-400 focus:ring-red-400'
                            : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                        }`}
                      />
                      {infoErrors.phone && (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {infoErrors.phone}
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        이메일 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleFormChange}
                        onBlur={() => {
                          if (!form.email.trim()) {
                            setInfoErrors((prev) => ({ ...prev, email: '이메일을 입력해 주세요' }));
                          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
                            setInfoErrors((prev) => ({ ...prev, email: '올바른 이메일 주소를 입력해 주세요' }));
                          } else {
                            setInfoErrors((prev) => ({ ...prev, email: undefined }));
                          }
                        }}
                        placeholder="your@email.com"
                        className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                          infoErrors.email
                            ? 'border-red-400 focus:ring-red-400'
                            : 'border-ft-border focus:ring-ft-ink focus:border-transparent'
                        }`}
                      />
                      {infoErrors.email ? (
                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                          <span>⚠</span> {infoErrors.email}
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-gray-400">플래너를 이 이메일로 발송합니다. 정확히 입력해 주세요.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 사주 정보 (사주 플래너 구매 시) */}
                {hasSajuProduct && (
                  <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 sm:p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🔮</span>
                      <h2 className="font-bold font-serif text-ft-ink">사주 정보</h2>
                    </div>
                    <p className="text-xs text-indigo-500 mb-4 ml-7">맞춤 플래너 제작에 필요합니다.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          생년월일 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="birthDate"
                          required={hasSajuProduct}
                          value={form.birthDate}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          성별
                        </label>
                        <select
                          name="birthGender"
                          value={form.birthGender}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all bg-ft-paper-alt"
                        >
                          <option value="">선택해주세요</option>
                          <option value="male">남성</option>
                          <option value="female">여성</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          태어난 시 <span className="text-gray-400 font-normal text-xs">(모르면 생략)</span>
                        </label>
                        <select
                          name="birthTime"
                          value={form.birthTime}
                          onChange={handleFormChange}
                          className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all bg-ft-paper-alt"
                        >
                          {BIRTH_TIMES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          특별 요청사항 <span className="text-gray-400 font-normal text-xs">(선택)</span>
                        </label>
                        <textarea
                          name="notes"
                          value={form.notes}
                          onChange={handleFormChange}
                          rows={3}
                          placeholder="예: 음력 생년월일로 분석 원함 / 특정 색상 테마 선호 등"
                          className="w-full px-4 py-3 text-sm border border-ft-border bg-ft-paper-alt rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-4 font-bold text-white bg-ft-ink rounded-2xl hover:bg-ft-ink-mid transition-colors shadow-lg mt-2"
                >
                  다음 단계: 결제 →
                </button>
              </form>
            )}

            {/* ── STEP 2: 결제 ───────────────────────────── */}
            {step === 'payment' && (
              <div className="space-y-4">
                {/* 주문자 정보 요약 */}
                <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold font-serif text-ft-ink text-sm">주문자 정보</h2>
                    <button
                      onClick={() => setStep('info')}
                      className="text-xs text-ft-ink-mid hover:text-ft-ink font-medium"
                    >
                      수정
                    </button>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">{form.name}</span></p>
                    <p>{form.email}</p>
                    {form.phone && <p>{form.phone}</p>}
                    {hasSajuProduct && form.birthDate && (
                      <p className="text-indigo-600">
                        생년월일: {form.birthDate} {form.birthTime && `(${form.birthTime})`}
                      </p>
                    )}
                  </div>
                </div>

                {/* 결제수단 선택 (PayPal 키가 있을 때만 토글 표시) */}
                {hasPaidItem && TOSS_PAYPAL_CLIENT_KEY && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setPaymentMethod('domestic'); setWidgetReady(false); setPaypalWidgetReady(false); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                        paymentMethod === 'domestic'
                          ? 'bg-ft-ink text-white border-ft-ink'
                          : 'bg-white text-ft-muted border-ft-border hover:border-ft-ink'
                      }`}
                    >
                      국내 결제 {formatPrice(total)}
                    </button>
                    <button
                      onClick={() => { setPaymentMethod('paypal'); setWidgetReady(false); setPaypalWidgetReady(false); }}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                        paymentMethod === 'paypal'
                          ? 'bg-[#0070ba] text-white border-[#0070ba]'
                          : 'bg-white text-ft-muted border-ft-border hover:border-[#0070ba]'
                      }`}
                    >
                      PayPal ${totalUsd}
                    </button>
                  </div>
                )}

                {/* 결제 방법 */}
                <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 sm:p-6">
                  <h2 className="font-bold font-serif text-ft-ink mb-4">
                    {paymentMethod === 'paypal' ? '🌐 PayPal' : '💳 결제 수단'}
                  </h2>

                  {hasPaidItem ? (
                    paymentMethod === 'domestic' ? (
                      <div>
                        <PaymentWidget
                          ref={paymentWidgetRef}
                          clientKey={TOSS_CLIENT_KEY}
                          customerKey={user?.id}
                          amount={total}
                          onReady={() => setWidgetReady(true)}
                          onError={(err) => console.error('[Checkout] 결제위젯 에러:', err)}
                        />
                      </div>
                    ) : (
                      <PayPalPaymentWidget
                        ref={paypalWidgetRef}
                        clientKey={TOSS_PAYPAL_CLIENT_KEY}
                        customerKey={user?.id ?? 'guest'}
                        amount={totalUsd}
                        onReady={() => setPaypalWidgetReady(true)}
                      />
                    )
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                      <p className="text-emerald-700 font-medium">🎁 무료 상품 — 결제 없이 신청 가능합니다</p>
                      <p className="text-xs text-emerald-600 mt-1">이메일로 다운로드 링크를 발송해 드립니다.</p>
                    </div>
                  )}
                </div>

                {/* 약관 동의 */}
                <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => {
                        setAgreeTerms(e.target.checked);
                        if (e.target.checked) setAgreeError('');
                      }}
                      className="mt-0.5 w-4 h-4 rounded border-ft-border text-ft-ink focus:ring-ft-ink flex-shrink-0"
                    />
                    <span className="text-sm text-gray-600 leading-relaxed">
                      <Link href="/terms" target="_blank" className="font-medium text-gray-900 underline hover:text-ft-ink transition-colors">
                        이용약관
                      </Link>{', '}
                      <Link href="/privacy" target="_blank" className="font-medium text-gray-900 underline hover:text-ft-ink transition-colors">
                        개인정보 처리방침
                      </Link>
                      {', '}
                      <Link href="/refund" target="_blank" className="font-medium text-gray-900 underline hover:text-ft-ink transition-colors">
                        환불정책
                      </Link>
                      에 동의합니다.
                      디지털 콘텐츠 특성상 PDF 발송 이후 환불이 불가하며, PDF는 발송일로부터 30일간 보관됨을 확인합니다.
                      사주 분석은 명리학의 학문적 관점에서 참고용으로 제공됩니다.
                    </span>
                  </label>
                  {agreeError && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                      <span>⚠</span> {agreeError}
                    </p>
                  )}
                </div>

                {paymentError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                    <p className="font-medium mb-1">결제 오류</p>
                    <p>{paymentError}</p>
                  </div>
                )}

                <button
                  onClick={handlePayment}
                  disabled={isSubmitting || (hasPaidItem && (paymentMethod === 'domestic' ? !widgetReady : !paypalWidgetReady))}
                  className={`w-full py-4 font-bold rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    !hasPaidItem
                      ? 'text-white bg-emerald-600 hover:bg-emerald-700'
                      : paymentMethod === 'paypal'
                      ? 'text-white bg-[#0070ba] hover:bg-[#005ea6]'
                      : 'text-ft-navy bg-ft-gold hover:bg-ft-gold-h'
                  }`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isSubmitting
                    ? '처리 중...'
                    : !hasPaidItem
                    ? '무료 신청 완료하기'
                    : paymentMethod === 'paypal'
                    ? `Pay $${totalUsd} with PayPal`
                    : `${formatPrice(total)} 결제하기`}
                </button>
              </div>
            )}
          </div>

          {/* ── 주문 요약 사이드바 ────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-ft-border p-5 sticky top-24">
              <h2 className="font-bold font-serif text-ft-ink mb-4">주문 상품</h2>

              <div className="space-y-3">
                {items.map(({ product, qty }) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-indigo-50">
                      <Image
                        src={product.thumbnailImage}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 leading-tight">{product.name}</p>
                      {qty > 1 && <p className="text-xs text-gray-400">× {qty}</p>}
                    </div>
                    <p className="text-xs font-bold text-gray-900 flex-shrink-0">
                      {getItemPrice(product.slug, product.price) > 0 ? formatPrice(getItemPrice(product.slug, product.price) * qty) : '무료'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="my-4 border-t border-gray-100" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>소계</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="text-emerald-600 font-medium">무료 (디지털)</span>
                </div>
              </div>

              <div className="my-4 border-t border-gray-100" />

              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-900">총 결제금액</span>
                <span className="text-xl font-black text-ft-ink">{formatPrice(total)}</span>
              </div>

              {/* 발송 안내 */}
              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1.5">
                <p className="flex items-start gap-1.5">
                  <span className="text-indigo-400">ℹ</span>
                  결제 완료 후 입력하신 이메일로 발송됩니다.
                </p>
                {hasSajuProduct ? (
                  <p className="flex items-start gap-1.5">
                    <span className="text-indigo-400">🔮</span>
                    사주 맞춤 플래너: 결제 후 자동 생성 (평균 5분 이내 이메일 발송)
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5">
                    <span className="text-indigo-400">📄</span>
                    무료 플래너: 신청 즉시 발송
                  </p>
                )}
                <p className="flex items-start gap-1.5">
                  <span className="text-amber-400">⏰</span>
                  PDF 파일은 발송일로부터 30일간 보관됩니다. 수신 후 즉시 다운로드해 주세요.
                </p>
                <p className="flex items-start gap-1.5">
                  <span className="text-indigo-400">📋</span>
                  <Link href="/refund" target="_blank" className="underline hover:text-indigo-600 transition-colors">
                    환불정책 확인하기
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
