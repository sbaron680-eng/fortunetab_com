'use client';

/**
 * TossPayments 결제위젯 컴포넌트
 * @tosspayments/payment-widget-sdk v0.12.x
 *
 * 사용 방법:
 * 1. ref를 통해 requestPayment()를 호출하면 Toss 결제창으로 이동
 * 2. 성공 시 → /checkout/success?paymentKey=...&orderId=...&amount=...
 * 3. 실패 시 → /checkout/fail?code=...&message=...&orderId=...
 */

import {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type { PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

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
  customerKey?: string;  // 비회원 = undefined → ANONYMOUS
  amount: number;
  onLoadStart?: () => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

const PaymentWidget = forwardRef<PaymentWidgetHandle, Props>(function PaymentWidget(
  { clientKey, customerKey, amount, onLoadStart, onReady, onError },
  ref,
) {
  const widgetRef = useRef<PaymentWidgetInstance | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useImperativeHandle(ref, () => ({
    requestPayment: async (params: RequestPaymentParams) => {
      if (!widgetRef.current) throw new Error('결제 위젯이 준비되지 않았습니다');
      await widgetRef.current.requestPayment({
        ...params,
        successUrl: `${window.location.origin}/checkout/success`,
        failUrl: `${window.location.origin}/checkout/fail`,
      });
    },
  }));

  useEffect(() => {
    let cancelled = false;
    onLoadStart?.();

    (async () => {
      try {
        const { loadPaymentWidget, ANONYMOUS } = await import(
          '@tosspayments/payment-widget-sdk'
        );
        const widget = await loadPaymentWidget(
          clientKey,
          customerKey ?? ANONYMOUS,
        );
        if (cancelled) return;

        widgetRef.current = widget;

        await widget.renderPaymentMethods('#toss-payment-method', amount);
        await widget.renderAgreement('#toss-payment-agreement');

        if (!cancelled) {
          setStatus('ready');
          onReady?.();
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          onError?.(err instanceof Error ? err : new Error(String(err)));
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
        </div>
      )}

      {/* 토스페이먼츠 SDK가 이 div에 결제 UI를 마운트합니다 */}
      <div id="toss-payment-method" />
      <div id="toss-payment-agreement" className="mt-4" />
    </div>
  );
});

export default PaymentWidget;
