import type { Metadata } from 'next';
import DownloadFlow from '@/components/download/DownloadFlow';

export const metadata: Metadata = {
  title: '부록 플래너 맛보기 — 무료 다운로드 | FortuneTab',
  description: '28종 플래너 부록 중 7종 무료 선택. 감사 저널·습관 트래커·할일 목록·비전 보드 등.',
};

export default function Page() {
  return <DownloadFlow initialFlow="extras" />;
}
