'use client';

/**
 * /premium-planner/view?order=UUID&token=UUID
 *
 * 이메일 내 다운로드 링크의 경유 페이지.
 * 1. Supabase RPC `track_download` 호출 → 열람 시각 기록
 * 2. 파일 URL이 있으면 자동 리다이렉트, 없으면 대기 안내
 *
 * 이메일 발송 시 링크 형식:
 *   https://fortunetab.com/premium-planner/view?order=ORDER_ID&token=ACCESS_TOKEN
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { trackDownload } from '@/lib/orders';

type Status = 'loading' | 'redirect' | 'pending' | 'error';

function ViewContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order') ?? '';
  const token   = searchParams.get('token') ?? '';

  const [status,   setStatus]   = useState<Status>('loading');
  const [fileUrl,  setFileUrl]  = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!orderId || !token) {
      setStatus('error');
      setErrorMsg('다운로드 링크가 올바르지 않습니다. 이메일을 다시 확인해 주세요.');
      return;
    }

    (async () => {
      const { fileUrl: url, error } = await trackDownload(orderId, token);

      if (error) {
        setStatus('error');
        setErrorMsg(error);
        return;
      }

      if (url) {
        setFileUrl(url);
        setStatus('redirect');
        setTimeout(() => { window.location.href = url; }, 1000);
      } else {
        setStatus('pending');
      }
    })();
  }, [orderId, token]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <svg className="animate-spin w-8 h-8 text-ft-ink" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-ft-muted text-sm">다운로드 링크를 확인하는 중입니다…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-red-100 rounded-full">
          <span className="text-3xl">⚠️</span>
        </div>
        <h2 className="text-xl font-bold font-serif text-ft-ink mb-2">링크 오류</h2>
        <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
        <p className="text-sm text-gray-400 mb-6">
          문의:{' '}
          <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">
            sbaron680@gmail.com
          </a>
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-ft-ink text-white rounded-xl text-sm font-medium"
        >
          홈으로 가기
        </Link>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-amber-100 rounded-full">
          <span className="text-3xl">🔮</span>
        </div>
        <h2 className="text-xl font-bold font-serif text-ft-ink mb-2">사주 플래너 제작 중</h2>
        <p className="text-sm text-gray-500 mb-4">
          현재 사주 분석 후 맞춤 제작 중입니다.<br />
          영업일 기준 1~2일 이내 이메일로 다운로드 링크를 다시 보내드립니다.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-6">
          주문이 접수되었으며 현재 제작 진행 중입니다.
        </div>
        <p className="text-sm text-gray-400">
          문의:{' '}
          <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline">
            sbaron680@gmail.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-emerald-100 rounded-full">
        <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h2 className="text-xl font-bold font-serif text-ft-ink mb-2">다운로드 준비 완료</h2>
      <p className="text-sm text-gray-500 mb-6">잠시 후 자동으로 파일이 열립니다…</p>
      <a
        href={fileUrl}
        className="inline-block px-6 py-3 bg-ft-gold text-ft-ink font-bold rounded-xl hover:bg-ft-gold-h transition-colors"
      >
        바로 다운로드
      </a>
      <p className="mt-4 text-xs text-gray-400">
        자동으로 열리지 않으면 위 버튼을 클릭하세요.
      </p>
    </div>
  );
}

export default function PremiumPlannerViewPage() {
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
          <ViewContent />
        </Suspense>
      </div>
    </div>
  );
}
