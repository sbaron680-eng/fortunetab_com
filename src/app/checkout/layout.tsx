import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '결제',
  description: 'FortuneTab 플래너 결제 페이지.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
