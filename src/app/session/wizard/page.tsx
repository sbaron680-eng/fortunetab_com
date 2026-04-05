'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
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
    setStep, setPaid,
  } = useSessionStore();
  const [hydrated, setHydrated] = useState(false);

  // Zustand persist가 sessionStorage에서 자동 복원 → hydration 대기
  useEffect(() => {
    setHydrated(true);
  }, []);

  // 결제 복귀 시 Step 5(AI 생성)로 직행 (데이터는 persist가 자동 복원)
  useEffect(() => {
    if (!hydrated) return;
    const paid = sessionStorage.getItem('ft_paid');
    if (paid) {
      setPaid(true);
      setStep(5);
      sessionStorage.removeItem('ft_paid');
      sessionStorage.removeItem('ft_pending_session');
    }
  }, [hydrated, setPaid, setStep]);

  // 모드 미선택 시 시작 페이지로 (hydration 완료 후에만 체크)
  useEffect(() => {
    if (hydrated && !mode) router.replace('/session');
  }, [hydrated, mode, router]);

  // hydration 전이거나 모드 없으면 렌더링 안 함
  if (!hydrated || !mode) return null;

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
              {currentStep + 1} / 8
            </span>
            <span className="text-xs font-medium text-ft-ink tracking-wide">
              {STEP_LABELS[currentStep]}
            </span>
          </div>
          <div className="h-2 bg-ft-border/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${((currentStep + 1) / 8) * 100}%`,
                background: 'linear-gradient(90deg, #111111, #333333)',
              }}
            />
          </div>
        </div>

        {/* 현재 Step */}
        <div key={currentStep} className="animate-step-in">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
