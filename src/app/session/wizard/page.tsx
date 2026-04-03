'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/stores/session';
import StepFortune from '@/components/session/StepFortune';
import StepQuestion from '@/components/session/StepQuestion';
import StepGenerate from '@/components/session/StepGenerate';
import StepGrow from '@/components/session/StepGrow';

const STEP_LABELS = [
  'Fortune Score',
  '막힘 진단',
  '수확 장면',
  '지금 목소리',
  '운명 흐름',
  '실행 브레이크',
  '뿌리 행동',
];

export default function SessionWizardPage() {
  const router = useRouter();
  const { currentStep, mode, result } = useSessionStore();

  // 모드 미선택 시 시작 페이지로
  useEffect(() => {
    if (!mode) router.replace('/session');
  }, [mode, router]);

  if (!mode) return null;

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
        return <StepGenerate phase="story" />;
      case 5:
        return <StepGenerate phase="brake" />;
      case 6:
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
              Step {currentStep} / 6
            </span>
            <span className="text-xs font-medium text-ft-ink">
              {STEP_LABELS[currentStep]}
            </span>
          </div>
          <div className="h-1.5 bg-ft-border rounded-full overflow-hidden">
            <div
              className="h-full bg-ft-ink rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* 현재 Step */}
        {renderStep()}
      </div>
    </div>
  );
}
