import type { Metadata } from 'next';
import DownloadFlow from '@/components/download/DownloadFlow';

export const metadata: Metadata = {
  title: '운세 플래너 — 무료 다운로드 | FortuneTab',
  description: '사주·운세 철학 기반 5종 기본 플래너. 커버·연간·월간·주간·일간. 브라우저에서 즉시 PDF 생성.',
};

export default function Page() {
  return <DownloadFlow initialFlow="fortune" />;
}
