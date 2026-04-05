'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionStore } from '@/lib/stores/session';
import { useAuthStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const LOADING_MESSAGES = [
  '당신의 이야기를 읽고 있습니다',
  '과거의 뿌리를 탐색하고 있습니다',
  '현재의 갈림길을 분석하고 있습니다',
  '미래의 수확을 그려보고 있습니다',
  '세 가지 관점을 종합하고 있습니다',
];

interface Props {
  phase: 'story' | 'brake';
}

export default function StepGenerate({ phase }: Props) {
  const { user } = useAuthStore();
  const {
    mode, fortuneScore, daunPhase, answers,
    isGenerating, result,
    setGenerating, setResult, nextStep, prevStep,
  } = useSessionStore();
  const [retryCount, setRetryCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const calledRef = useRef(false);

  // AI API가 아직 배포되지 않았는지 확인 (static export에서는 /api 미포함)
  const [apiUnavailable, setApiUnavailable] = useState(false);

  // story 단계에서 API 호출 (1번만, retry 시 retryCount 변경으로 재실행)
  useEffect(() => {
    if (phase !== 'story' || result) return;
    if (calledRef.current && retryCount === 0) return;
    calledRef.current = true;

    async function generate() {
      setGenerating(true);
      setErrorMsg('');
      setApiUnavailable(false);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('로그인이 필요합니다');

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const res = await fetch(`${supabaseUrl}/functions/v1/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': anonKey,
          },
          body: JSON.stringify({
            mode,
            fortuneScore: fortuneScore ?? 0,
            daunPhase: daunPhase ?? '안정기',
            answers: {
              step1: answers.step1,
              step2: answers.step2,
              step3: answers.step3,
            },
          }),
        });

        // Edge Function 미배포 시
        if (res.status === 404) {
          setApiUnavailable(true);
          return;
        }

        const data = await res.json();
        if (!data?.ok) throw new Error(data?.error || 'AI 생성 실패');
        setResult({ story: data.story, actions: data.actions, brake: data.brake });
      } catch (err) {
        // fetch 자체 실패 또는 HTML 404 페이지 반환 시
        if (err instanceof TypeError || (err instanceof Error && err.message.includes('JSON'))) {
          setApiUnavailable(true);
          return;
        }
        setErrorMsg(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      } finally {
        setGenerating(false);
      }
    }

    generate();
  }, [phase, result, retryCount, mode, fortuneScore, daunPhase, answers, setGenerating, setResult]);

  // AI API 미배포 상태 (준비 중)
  if (apiUnavailable) {
    return (
      <div className="bg-white border border-ft-border rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🚀</div>
        <p className="font-serif text-lg font-bold text-ft-ink mb-2">
          AI 분석 기능 준비 중
        </p>
        <p className="text-sm text-ft-muted mb-2 leading-relaxed">
          Claude AI 기반 명발굴 분석은 현재 개발 중입니다.<br />
          곧 업데이트될 예정이니 조금만 기다려 주세요!
        </p>
        <p className="text-xs text-ft-muted mb-6">
          입력하신 내용은 서비스 오픈 시 바로 활용할 수 있습니다.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={prevStep}
            className="px-6 py-2 rounded-xl border border-ft-border text-ft-muted text-sm font-medium hover:bg-ft-paper transition-colors"
          >
            이전 단계로
          </button>
          <Link
            href="/"
            className="px-6 py-2 rounded-xl bg-ft-ink text-white text-sm font-medium hover:bg-ft-ink/90 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  // 로딩 메시지 순환
  const [loadingIdx, setLoadingIdx] = useState(0);
  useEffect(() => {
    if (!isGenerating) return;
    const timer = setInterval(() => {
      setLoadingIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [isGenerating]);

  // 로딩 상태
  if (isGenerating) {
    return (
      <div className="bg-white border border-ft-border rounded-2xl p-10 text-center">
        {/* 3개 점 타이핑 애니메이션 */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-ft-ink"
              style={{
                animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
        <p key={loadingIdx} className="font-serif text-lg font-bold text-ft-ink mb-2 animate-step-in">
          {LOADING_MESSAGES[loadingIdx]}
        </p>
        <p className="text-sm text-ft-muted">
          AI가 세 가지 관점에서 분석 중입니다
        </p>
        {/* 진행 바 */}
        <div className="mt-6 mx-auto max-w-xs">
          <div className="h-1 bg-ft-border/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-ft-ink/40 rounded-full"
              style={{
                width: `${Math.min(((loadingIdx + 1) / LOADING_MESSAGES.length) * 100, 90)}%`,
                transition: 'width 2.5s ease-out',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 에러 (result 없음)
  if (!result) {
    return (
      <div className="bg-white border border-ft-border rounded-2xl p-8 text-center">
        <p className="text-sm text-red-600 mb-4">{errorMsg || '분석 중 오류가 발생했습니다.'}</p>
        <button
          onClick={() => setRetryCount((c) => c + 1)}
          className="px-6 py-2 rounded-xl bg-ft-ink text-white text-sm font-medium"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Story 결과 표시
  if (phase === 'story') {
    const storyCards = [
      { label: '과거 뿌리', text: result.story.pastRoot, icon: '🌱', accent: 'border-l-emerald-400' },
      { label: '현재 갈림길', text: result.story.presentCrossroad, icon: '🔀', accent: 'border-l-amber-400' },
      { label: '미래 수확', text: result.story.futureHarvest, icon: '🌾', accent: 'border-l-blue-400' },
    ];

    return (
      <div className="bg-white border border-ft-border rounded-2xl p-6">
        <h2 className="font-serif text-lg font-bold text-ft-ink mb-1">운명 흐름</h2>
        <p className="text-sm text-ft-muted mb-6">AI가 당신의 이야기에서 발견한 3구간 흐름</p>

        <div className="space-y-4 mb-6">
          {storyCards.map((s, i) => (
            <div
              key={s.label}
              className={`bg-ft-paper rounded-xl p-4 border-l-4 ${s.accent} animate-stagger-in`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{s.icon}</span>
                <span className="text-xs font-semibold text-ft-ink uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-sm text-ft-ink/80 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>

        {/* 타임라인 연결선 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-ft-muted">과거</span>
          <div className="flex-1 h-px bg-gradient-to-r from-emerald-300 via-amber-300 to-blue-300" />
          <span className="text-xs text-ft-muted">미래</span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={prevStep}
            className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm hover:bg-ft-paper transition-colors"
          >
            이전
          </button>
          <button
            onClick={nextStep}
            className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm hover:bg-ft-ink/90 transition-colors"
          >
            다음
          </button>
        </div>
      </div>
    );
  }

  // Brake 결과 표시
  const brakeCards = [
    { label: '성장 목표', text: result.brake.growthGoal, color: 'bg-emerald-50 border-emerald-100', icon: '🎯' },
    { label: '브레이크 행동', text: result.brake.brakeAction, color: 'bg-red-50 border-red-100', icon: '🚧' },
    { label: '숨겨진 이유', text: result.brake.hiddenReason, color: 'bg-amber-50 border-amber-100', icon: '🔍' },
    { label: '핵심 믿음', text: result.brake.coreBelief, color: 'bg-purple-50 border-purple-100', icon: '💎' },
  ];

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-6">
      <h2 className="font-serif text-lg font-bold text-ft-ink mb-1">실행 브레이크 진단</h2>
      <p className="text-sm text-ft-muted mb-6">미루는 패턴 아래 숨겨진 구조를 발견합니다</p>

      <div className="space-y-4 mb-6">
        {brakeCards.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-xl p-4 border ${s.color} animate-stagger-in`}
            style={{ animationDelay: `${i * 0.12}s` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{s.icon}</span>
              <p className="text-xs font-semibold text-ft-ink">{s.label}</p>
            </div>
            <p className="text-sm text-ft-ink/80 leading-relaxed ml-7">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm hover:bg-ft-paper transition-colors"
        >
          이전
        </button>
        <button
          onClick={nextStep}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm hover:bg-ft-ink/90 transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  );
}
