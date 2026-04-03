'use client';

import { useSessionStore, type SessionAnswers } from '@/lib/stores/session';

// ─── biz/gen 모드별 질문 ──────────────────────────────────────────────

const QUESTIONS: Record<string, { biz: string; gen: string; placeholder: { biz: string; gen: string } }> = {
  step1: {
    biz: '사업에서 지금 어느 부분이 보이지 않나요?',
    gen: '요즘 혼자 있을 때 자꾸 머릿속을 맴도는 생각이 있나요?',
    placeholder: {
      biz: '예: 매출이 정체되어 있는데 원인을 모르겠어요...',
      gen: '예: 이 직장이 맞는 건지, 다른 길이 있는 건지...',
    },
  },
  step2: {
    biz: '이 막힘이 해결된 후, 사업은 어떤 모습일까요?',
    gen: '이 고민이 해결됐을 때, 나는 어디서 무엇을 하고 있나요?',
    placeholder: {
      biz: '예: 매달 안정적인 매출이 들어오고 새 서비스를 준비하는...',
      gen: '예: 매일 아침 설레는 마음으로 출근하고 있는...',
    },
  },
  step3: {
    biz: '사업하면서 밤에 혼자 있을 때 문득 나오는 두려움은?',
    gen: '아무도 없을 때 혼자 중얼거리는 걱정이나 불안의 말은?',
    placeholder: {
      biz: '예: 이러다 다 잃으면 어쩌지... 내가 이걸 할 수 있을까...',
      gen: '예: 나이만 먹고 아무것도 못 이룬 건 아닌지...',
    },
  },
};

interface Props {
  stepKey: keyof Pick<SessionAnswers, 'step1' | 'step2' | 'step3'>;
  title: string;
  subtitle: string;
}

export default function StepQuestion({ stepKey, title, subtitle }: Props) {
  const { mode, answers, setAnswer, nextStep, prevStep } = useSessionStore();
  const value = answers[stepKey];
  const q = QUESTIONS[stepKey];
  const modeKey = mode ?? 'gen';

  const canProceed = value.trim().length >= 10;

  return (
    <div className="bg-white border border-ft-border rounded-2xl p-6">
      <h2 className="font-serif text-lg font-bold text-ft-ink mb-1">{title}</h2>
      <p className="text-sm text-ft-muted mb-6">{subtitle}</p>

      {/* 모드별 질문 */}
      <p className="text-sm font-medium text-ft-ink mb-3">
        {q[modeKey]}
      </p>

      <textarea
        value={value}
        onChange={(e) => setAnswer(stepKey, e.target.value)}
        placeholder={q.placeholder[modeKey]}
        rows={5}
        className="w-full border border-ft-border rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ft-ink/20 placeholder:text-ft-muted/50"
      />

      <p className="text-xs text-ft-muted mt-1 mb-6">
        {value.trim().length < 10
          ? `최소 10자 이상 입력해 주세요 (${value.trim().length}/10)`
          : `${value.trim().length}자`}
      </p>

      {/* 네비게이션 */}
      <div className="flex gap-3">
        <button
          onClick={prevStep}
          className="flex-1 py-3 rounded-xl border border-ft-border text-ft-muted font-medium text-sm hover:bg-ft-paper transition-colors"
        >
          이전
        </button>
        <button
          onClick={nextStep}
          disabled={!canProceed}
          className="flex-1 py-3 rounded-xl bg-ft-ink text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ft-ink/90 transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  );
}
