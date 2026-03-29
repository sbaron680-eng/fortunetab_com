import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '무료 사주 계산기 — 사주팔자·오행·월별 운세 | FortuneTab',
  description: '생년월일시로 사주팔자를 즉시 계산. 오행 분포, 용신, 십신, 대운, 신살, 월별 운세를 무료로 확인하세요.',
  openGraph: {
    title: '무료 사주 계산기 | FortuneTab',
    description: '사주팔자, 오행, 월별 운세를 무료로 계산합니다.',
  },
};

export default function SajuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
