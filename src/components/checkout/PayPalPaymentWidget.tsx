'use client';

/**
 * TossPayments v2 SDK — PayPal 결제위젯 컴포넌트
 *
 * 국내 결제(v1 SDK)와 독립적으로 동작합니다.
 * CDN 스크립트를 동적으로 로드하고, variantKey: "PAYPAL"로 위젯을 렌더합니다.
 */

import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';

const V2_SDK_URL = 'https://js.tosspayments.com/v2/standard';

export interface PayPalRequestPaymentParams {
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  product: {
    name: string;
    unitAmount: number;
  };
}

export interface PayPalPaymentWidgetHandle {
  requestPayment: (params: PayPalRequestPaymentParams) => Promise<void>;
}

interface Props {
  clientKey: string;
  customerKey: string;
  amount: number; // USD
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/** v2 CDN 스크립트를 한 번만 로드 */
function loadV2Script(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${V2_SDK_URL}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('TossPayments v2 SDK 로드 실패')));
      if (window.TossPayments) resolve();
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = V2_SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TossPayments v2 SDK 로드 실패'));
    document.head.appendChild(script);
  });
}

/** 컨테이너 내부의 자식 노드를 안전하게 제거 */
function clearContainer(id: string) {
  const el = document.getElementById(id);
  if (el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }
}

const PayPalPaymentWidget = forwardRef<PayPalPaymentWidgetHandle, Props>(
  function PayPalPaymentWidget({ clientKey, customerKey, amount, onReady, onError }, ref) {
    const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
    const onReadyRef = useRef(onReady);
    const onErrorRef = useRef(onError);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
    const [retryCount, setRetryCount] = useState(0);

    onReadyRef.current = onReady;
    onErrorRef.current = onError;

    useImperativeHandle(ref, () => ({
      requestPayment: async (params: PayPalRequestPaymentParams) => {
        if (!widgetsRef.current) throw new Error('PayPal 위젯이 준비되지 않았습니다');
        const payload = {
          orderId: params.orderId,
          orderName: params.orderName,
          customerEmail: params.customerEmail,
          customerName: params.customerName,
          successUrl: `${window.location.origin}/checkout/success?paymentType=PAYPAL`,
          failUrl: `${window.location.origin}/checkout/fail`,
          foreignEasyPay: {
            country: 'US',
            products: [{
              name: params.product.name,
              description: params.product.name,
              quantity: 1,
              unitAmount: params.product.unitAmount,
              currency: 'USD',
            }],
            shipping: { fullName: params.customerName },
          },
        };
        console.log('[PayPalWidget] requestPayment payload:', JSON.stringify(payload, null, 2));
        try {
          const result = await widgetsRef.current.requestPayment(payload);
          console.log('[PayPalWidget] requestPayment result:', result);
        } catch (err) {
          console.error('[PayPalWidget] requestPayment error:', err);
          throw err;
        }
      },
    }));

    useEffect(() => {
      let cancelled = false;

      async function initWidget() {
        try {
          setStatus('loading');
          await loadV2Script();

          if (cancelled) return;

          const tp = window.TossPayments!(clientKey);
          const widgets = tp.widgets({ customerKey });

          await widgets.setAmount({ currency: 'USD', value: amount });

          // 렌더 전 기존 컨테이너 자식 제거 (재시도 시 중복 방지)
          clearContainer('paypal-payment-method');
          clearContainer('paypal-agreement');

          await Promise.all([
            widgets.renderPaymentMethods({ selector: '#paypal-payment-method', variantKey: 'PAYPAL' }),
            widgets.renderAgreement({ selector: '#paypal-agreement', variantKey: 'AGREEMENT' }),
          ]);

          if (cancelled) return;

          widgetsRef.current = widgets;
          setStatus('ready');
          onReadyRef.current?.();
        } catch (err) {
          if (cancelled) return;
          console.error('[PayPalWidget] init error:', err);
          setStatus('error');
          onErrorRef.current?.(err instanceof Error ? err : new Error(String(err)));
        }
      }

      initWidget();

      return () => { cancelled = true; };
    }, [clientKey, customerKey, amount, retryCount]);

    const handleRetry = () => {
      widgetsRef.current = null;
      setRetryCount((c) => c + 1);
    };

    return (
      <div>
        {status === 'loading' && (
          <div className="flex items-center justify-center py-8 text-sm text-ft-muted gap-2">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            PayPal 결제 수단 불러오는 중…
          </div>
        )}

        {status === 'error' && (
          <div className="text-center py-6">
            <p className="text-sm text-red-500 mb-3">
              PayPal 결제 모듈을 불러올 수 없습니다.
            </p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0070ba] rounded-lg hover:bg-[#005ea6] transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        <div id="paypal-payment-method" />
        <div id="paypal-agreement" className="mt-4" />
      </div>
    );
  },
);

export default PayPalPaymentWidget;
