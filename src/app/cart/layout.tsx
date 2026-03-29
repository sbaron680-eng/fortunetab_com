import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '장바구니',
  description: 'FortuneTab 장바구니 — 선택한 플래너 상품을 확인하고 결제하세요.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
