import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI 운세 분석 — 사주·별자리·궁합 | FortuneTab',
  description: 'Claude AI 기반 사주 분석, 별자리 운세, 궁합 분석. 2026년 월별 운세, 행운색, 행운숫자를 확인하세요.',
  openGraph: {
    title: 'AI 운세 분석 | FortuneTab',
    description: '사주·별자리·궁합을 AI로 심층 분석합니다.',
  },
};

export default function FortuneLayout({ children }: { children: React.ReactNode }) {
  return children;
}
