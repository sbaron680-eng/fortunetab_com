import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '프리미엄 플래너 — 맞춤 PDF 생성 | FortuneTab',
  description: '결제 완료된 사주 플래너 주문의 맞춤 PDF를 생성합니다. 일간 365일 풀버전 · 사주 기반 자동 운세 삽입.',
  robots: { index: false, follow: false },
};

export default function PremiumPlannerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
