'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const INQUIRY_TYPES = [
  { value: '주문/결제 문의', label: '주문/결제 문의' },
  { value: '다운로드 문의', label: '다운로드 문의' },
  { value: '환불/취소 문의', label: '환불/취소 문의' },
  { value: '서비스 이용 문의', label: '서비스 이용 문의' },
  { value: '기타', label: '기타' },
];

export default function ContactPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [type, setType]       = useState(INQUIRY_TYPES[0].value);
  const [message, setMessage] = useState('');
  const [state, setState]     = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setState('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('https://formspree.io/f/mvzwyadq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          _subject: `[FortuneTab 문의] ${type} — ${name}`,
          inquiry_type: type,
          message,
        }),
      });

      if (res.ok) {
        setState('success');
        setName(''); setEmail(''); setType(INQUIRY_TYPES[0].value); setMessage('');
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data?.error ?? '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        setState('error');
      }
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      setState('error');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-16 px-4">
      <div className="max-w-xl mx-auto">

        {/* 헤더 */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-ft-muted hover:text-ft-ink transition-colors">
            ← 홈으로
          </Link>
          <h1 className="mt-4 text-2xl font-bold font-serif text-ft-ink">문의하기</h1>
          <p className="mt-2 text-sm text-ft-muted">
            궁금한 점을 남겨주세요. 영업일 기준 1~2일 내 이메일로 답변드립니다.
          </p>
        </div>

        {/* 성공 상태 */}
        {state === 'success' ? (
          <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-ft-ink mb-2">문의가 접수되었습니다</h2>
            <p className="text-sm text-ft-muted mb-6">
              입력하신 이메일로 1~2 영업일 내에 답변드리겠습니다.
            </p>
            <button
              onClick={() => setState('idle')}
              className="px-6 py-2.5 text-sm font-semibold bg-ft-ink text-white rounded-xl hover:bg-ft-ink-mid transition-colors"
            >
              새 문의 작성
            </button>
          </div>
        ) : (
          <div className="bg-white border border-ft-border rounded-2xl shadow-sm p-8">

            {/* 에러 배너 */}
            {state === 'error' && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* 이름 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이름</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all"
                />
              </div>

              {/* 이메일 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all"
                />
              </div>

              {/* 문의 유형 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">문의 유형</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all bg-white"
                >
                  {INQUIRY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* 문의 내용 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">문의 내용</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="문의하실 내용을 자세히 적어주세요."
                  className="w-full px-4 py-3 text-sm border border-ft-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ft-ink focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={state === 'submitting'}
                className="w-full py-3.5 font-bold text-white bg-ft-ink rounded-xl hover:bg-ft-ink-mid transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {state === 'submitting' && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {state === 'submitting' ? '전송 중...' : '문의 보내기'}
              </button>
            </form>

            {/* 빠른 문의 안내 */}
            <p className="mt-5 text-center text-xs text-ft-muted">
              급한 문의는{' '}
              <a href="mailto:sbaron680@gmail.com" className="text-ft-ink underline underline-offset-2 hover:text-ft-ink-mid transition-colors">
                sbaron680@gmail.com
              </a>
              으로 직접 이메일 주셔도 됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
