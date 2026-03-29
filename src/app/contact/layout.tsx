import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '문의하기',
  description: 'FortuneTab 고객센터 — 문의, 건의, 오류 신고를 접수하세요.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
