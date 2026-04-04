'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
import type { SessionAnswers } from '@/lib/stores/session';
import StepFortune from '@/components/session/StepFortune';
import StepQuestion from '@/components/session/StepQuestion';
import StepPaywall from '@/components/session/StepPaywall';
import StepGenerate from '@/components/session/StepGenerate';
import StepGrow from '@/components/session/StepGrow';

const STEP_LABELS = [
  'Fortune Score',
  '막힘 진단',
  '수확 장면',
  '지금 목소리',
  '결제',
  '운명 흐름',
  '실행 브레이크',
  '뿌리 행동',
];

export default function SessionWizardPage() {
  const router = useRouter();
  const {
    currentStep, mode,
    setMode, setStep, setAnswer, setFortuneScore, setPaid,
  } = useSessionStore();
  const [isRestoring, setIsRestoring] = useState(true);

  // 결제 복귀 시 sessionStorage에서 Zustand 스토어 복원
  useEffect(() => {
    const paid = sessionStorage.getItem('ft_paid');
    const pendingRaw = sessionStorage.getItem('ft_pending_session');

    if (paid && pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);

        // 스토어 복원
        if (pending.mode) setMode(pending.mode);
        if (pending.fortuneScore != null) {
          setFortuneScore(
            pending.fortuneScore,
            pending.fortunePercent ?? 50,
            pending.daunPhase ?? '안정기',
            pending.gradeLabel ?? '중립',
          );
        }
        if (pending.answers) {
          for (const [key, value] of Object.entries(pending.answers)) {
            if (typeof value === 'string') {
              setAnswer(key as keyof SessionAnswers, value);
            }
          }
        }

        // 결제 완료 → Step 5(AI 생성)로 직행
        setPaid(true);
        setStep(5);

        sessionStorage.removeItem('ft_paid');
        sessionStorage.removeItem('ft_pending_session');
      } catch {
        // 파싱 실패 시 무시
      }
    }

    setIsRestoring(false);
  }, [setMode, setStep, setAnswer, setFortuneScore, setPaid]);

  // 모드 미선택 시 시작 페이지로 (복원 완료 후에만 체크)
  useEffect(() => {
    if (!isRestoring && !mode) router.replace('/session');
  }, [isRestoring, mode, router]);

  // 복원 중이거나 모드 없으면 렌더링 안 함
  if (isRestoring || !mode) return null;

  function renderStep() {
    switch (currentStep) {
      case 0:
        return <StepFortune />;
      case 1:
        return (
          <StepQuestion
            stepKey="step1"
            title="막힘 진단"
            subtitle="지금 어디서 막혔는지 솔직하게 적어주세요"
          />
        );
      case 2:
        return (
          <StepQuestion
            stepKey="step2"
            title="수확 장면"
            subtitle="이 막힘이 해결된 후의 모습을 상상해 주세요"
          />
        );
      case 3:
        return (
          <StepQuestion
            stepKey="step3"
            title="지금 목소리"
            subtitle="아무도 없을 때 솔직히 느끼는 감정을 말해주세요"
          />
        );
      case 4:
        return <StepPaywall />;
      case 5:
        return <StepGenerate phase="story" />;
      case 6:
        return <StepGenerate phase="brake" />;
      case 7:
        return <StepGrow />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* 프로그레스 바 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-ft-muted">
              Step {currentStep} / 7
            </span>
            <span className="text-xs font-medium text-ft-ink">
              {STEP_LABELS[currentStep]}
            </span>
          </div>
          <div className="h-1.5 bg-ft-border rounded-full overflow-hidden">
            <div
              className="h-full bg-ft-ink rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* 현재 Step */}
        {renderStep()}
      </div>
    </div>
  );
}
