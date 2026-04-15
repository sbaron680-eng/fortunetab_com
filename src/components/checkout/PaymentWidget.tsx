'use client';

/**
 * TossPayments v2 SDK 결제위젯 컴포넌트
 * @tosspayments/tosspayments-sdk
 *
 * 1. ref.requestPayment()를 호출하면 Toss 결제창으로 이동
 * 2. 성공 → /checkout/success?paymentKey=...&orderId=...&amount=...
 * 3. 실패 → /checkout/fail?code=...&message=...&orderId=...
 */

import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';

export interface RequestPaymentParams {
  orderId: string;
  orderName: string;
  customerName: string;
  customerEmail: string;
  customerMobilePhone?: string;
}

export interface PaymentWidgetHandle {
  requestPayment: (params: RequestPaymentParams) => Promise<void>;
}

interface Props {
  clientKey: string;
  customerKey?: string;
  amount: number;
  onLoadStart?: () => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

const PaymentWidget = forwardRef<PaymentWidgetHandle, Props>(function PaymentWidget(
  { clientKey, customerKey, amount, onLoadStart, onReady, onError },
  ref,
) {
  const widgetsRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useImperativeHandle(ref, () => ({
    requestPayment: async (params: RequestPaymentParams) => {
      if (!widgetsRef.current) throw new Error('결제 위젯이 준비되지 않았습니다');
      await widgetsRef.current.requestPayment({
        orderId: params.orderId,
        orderName: params.orderName,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerMobilePhone: params.customerMobilePhone,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    },
  }));

  useEffect(() => {
    let cancelled = false;
    onLoadStart?.();

    if (!clientKey) {
      setStatus('error');
      setErrorMessage('결제 키가 설정되지 않았습니다');
      return;
    }

    (async () => {
      try {
        const { loadTossPayments, ANONYMOUS } = await import(
          '@tosspayments/tosspayments-sdk'
        );
        if (cancelled) return;

        const tossPayments = await loadTossPayments(clientKey);
        if (cancelled) return;

        const widgets = tossPayments.widgets({
          customerKey: customerKey ?? ANONYMOUS,
        });

        await widgets.setAmount({ currency: 'KRW', value: amount });
        if (cancelled) return;

        await Promise.all([
          widgets.renderPaymentMethods({
            selector: '#toss-payment-method',
            variantKey: 'DEFAULT',
          }),
          widgets.renderAgreement({
            selector: '#toss-payment-agreement',
            variantKey: 'AGREEMENT',
          }),
        ]);

        if (!cancelled) {
          widgetsRef.current = widgets;
          setStatus('ready');
          onReady?.();
        }
      } catch (err) {
        if (!cancelled) {
          const error = err instanceof Error ? err : new Error(String(err));
          setStatus('error');
          setErrorMessage(error.message);
          onError?.(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientKey, customerKey, amount]);

  return (
    <div>
      {status === 'loading' && (
        <div className="flex items-center justify-center py-8 text-sm text-ft-muted gap-2">
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          결제 수단 불러오는 중…
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-6 text-sm text-red-500">
          결제 모듈을 불러올 수 없습니다. 새로고침 후 다시 시도해 주세요.
          {errorMessage && (
            <p className="mt-2 text-xs text-gray-400">{errorMessage}</p>
          )}
        </div>
      )}

      <div id="toss-payment-method" />
      <div id="toss-payment-agreement" className="mt-4" />
    </div>
  );
});

export default PaymentWidget;
