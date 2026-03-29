import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '마이페이지',
  description: '주문 내역, 다운로드 관리, 계정 설정.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
