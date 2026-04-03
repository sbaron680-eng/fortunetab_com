'use client';

import { create } from 'zustand';
import type { UserMode, DaunPhase } from '@/lib/supabase';

// ─── 타입 ─────────────────────────────────────────────────────────────

export interface SessionAnswers {
  step1: string; // 막힘 진단
  step2: string; // 수확 장면
  step3: string; // 지금 목소리
  step4Brake: string; // 실행 브레이크 답변 (biz: 미루는 것 / gen: 시작 못한 것)
  firstSprout: string; // 첫 싹 선언
}

export interface StoryResult {
  pastRoot: string;
  presentCrossroad: string;
  futureHarvest: string;
}

export interface ActionsResult {
  ground: string;
  root: string;
  open: string;
  water: string;
}

export interface BrakeResult {
  growthGoal: string;
  brakeAction: string;
  hiddenReason: string;
  coreBelief: string;
}

export interface GenerateResult {
  story: StoryResult;
  actions: ActionsResult;
  brake: BrakeResult;
}

interface SessionState {
  // 진행 상태
  currentStep: number;       // 0~6
  mode: UserMode | null;
  isGenerating: boolean;

  // Fortune Score
  fortuneScore: number | null;
  fortunePercent: number | null;
  daunPhase: DaunPhase | null;
  gradeLabel: string | null;

  // 답변
  answers: SessionAnswers;

  // AI 생성 결과
  result: GenerateResult | null;

  // 세션 ID (DB 저장 후)
  sessionId: string | null;

  // 액션
  setMode: (mode: UserMode) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setAnswer: <K extends keyof SessionAnswers>(key: K, value: string) => void;
  setFortuneScore: (score: number, percent: number, phase: DaunPhase, label: string) => void;
  setGenerating: (v: boolean) => void;
  setResult: (result: GenerateResult) => void;
  setSessionId: (id: string) => void;
  reset: () => void;
}

// ─── 초기 상태 ────────────────────────────────────────────────────────

const INITIAL_ANSWERS: SessionAnswers = {
  step1: '',
  step2: '',
  step3: '',
  step4Brake: '',
  firstSprout: '',
};

// ─── 스토어 ───────────────────────────────────────────────────────────

export const useSessionStore = create<SessionState>()((set) => ({
  currentStep: 0,
  mode: null,
  isGenerating: false,
  fortuneScore: null,
  fortunePercent: null,
  daunPhase: null,
  gradeLabel: null,
  answers: { ...INITIAL_ANSWERS },
  result: null,
  sessionId: null,

  setMode: (mode) => set({ mode }),
  setStep: (step) => set({ currentStep: step }),
  nextStep: () => set((s) => ({ currentStep: Math.min(s.currentStep + 1, 6) })),
  prevStep: () => set((s) => ({ currentStep: Math.max(s.currentStep - 1, 0) })),
  setAnswer: (key, value) =>
    set((s) => ({ answers: { ...s.answers, [key]: value } })),
  setFortuneScore: (score, percent, phase, label) =>
    set({ fortuneScore: score, fortunePercent: percent, daunPhase: phase, gradeLabel: label }),
  setGenerating: (v) => set({ isGenerating: v }),
  setResult: (result) => set({ result }),
  setSessionId: (id) => set({ sessionId: id }),
  reset: () =>
    set({
      currentStep: 0,
      mode: null,
      isGenerating: false,
      fortuneScore: null,
      fortunePercent: null,
      daunPhase: null,
      gradeLabel: null,
      answers: { ...INITIAL_ANSWERS },
      result: null,
      sessionId: null,
    }),
}));
