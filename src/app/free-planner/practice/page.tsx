import type { Metadata } from 'next';
import DownloadFlow from '@/components/download/DownloadFlow';

export const metadata: Metadata = {
  title: '실천 플래너 — 무료 다운로드 | FortuneTab',
  description: 'OKR·MIT·습관 트래커 내장. 목표 달성·실행에 집중한 5종 플래너. 브라우저에서 즉시 PDF 생성.',
};

export default function Page() {
  return <DownloadFlow initialFlow="practice" />;
}
