'use client';

/**
 * /checkout/fail
 * 토스페이먼츠 결제 실패/취소 후 redirect되는 페이지
 * URL params: code, message, orderId
 */

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function FailContent() {
  const searchParams = useSearchParams();
  const code    = searchParams.get('code') ?? 'UNKNOWN';
  const message = searchParams.get('message') ?? '결제가 취소되었거나 오류가 발생했습니다.';
  const orderId = searchParams.get('orderId') ?? '';

  const isCancelled = code === 'PAY_PROCESS_CANCELED' || code === 'USER_CANCEL';

  return (
    <div className="text-center">
      <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-red-50 rounded-full">
        <span className="text-4xl">{isCancelled ? '↩️' : '⚠️'}</span>
      </div>

      <h1 className="text-2xl font-black font-serif text-ft-ink mb-2">
        {isCancelled ? '결제가 취소되었습니다' : '결제에 실패했습니다'}
      </h1>

      {orderId && (
        <p className="text-gray-400 text-xs mb-2">주문번호: {orderId}</p>
      )}

      <div className="my-4 bg-red-50 rounded-xl p-4 text-sm text-red-700 border border-red-100">
        <p className="font-medium">{message}</p>
        {!isCancelled && (
          <p className="text-xs text-red-500 mt-1">오류 코드: {code}</p>
        )}
      </div>

      {isCancelled ? (
        <p className="text-sm text-gray-500 mb-6">장바구니의 상품은 그대로 유지됩니다. 다시 결제를 진행하실 수 있습니다.</p>
      ) : (
        <p className="text-sm text-gray-500 mb-6">
          문제가 지속되면 고객센터({' '}
          <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">
            sbaron680@gmail.com
          </a>
          )로 문의해 주세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Link
          href="/checkout"
          className="block w-full py-3.5 font-bold text-ft-ink bg-ft-gold rounded-xl hover:bg-ft-gold-h transition-colors text-center"
        >
          다시 결제하기
        </Link>
        <Link
          href="/cart"
          className="block w-full py-3 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-center"
        >
          장바구니로 돌아가기
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutFailPage() {
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
          <FailContent />
        </Suspense>
      </div>
    </div>
  );
}
