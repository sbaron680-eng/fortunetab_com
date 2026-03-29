import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PDF 플래너 다운로드 — 무료 플래너 생성기',
  description: '커버, 연간, 월간, 주간, 일간 플래너 + 28종 부록 페이지를 선택하여 PDF를 즉시 생성하세요.',
  openGraph: {
    title: 'PDF 플래너 다운로드',
    description: '나만의 플래너를 브라우저에서 즉시 PDF로 생성합니다.',
  },
};

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
