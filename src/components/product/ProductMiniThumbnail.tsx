'use client';

/**
 * ProductMiniThumbnail
 * 장바구니·주문 목록 등의 작은 썸네일에 실시간 플래너 커버를 렌더.
 * 정적 이미지 대신 PlannerPreviewCanvas를 사용해 상품 상세의 미리보기와 동일한 출력을 보장.
 */

import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import { PLANNER_YEAR } from '@/lib/products';
import type { Product } from '@/types';

const SAMPLE_SAJU = {
  ganzhi: '丙午',
  dayElem: '丙火',
  yongsin: '水',
  yearPillar: '丙午',
  monthPillar: '甲辰',
  dayPillar: '戊寅',
  hourPillar: '壬子',
  elemSummary: '화2 목1 토1 수1 금0',
} as const;

interface Props {
  product: Product;
  size?: number; // px (default 64)
}

/** 플래너 상품인지 판별 — 캔버스 렌더 가능한 상품만 */
function isPlannerProduct(product: Product): boolean {
  return !!product.coverStyle || product.slug.includes('planner') || product.slug.includes('extras');
}

export default function ProductMiniThumbnail({ product, size = 64 }: Props) {
  if (!isPlannerProduct(product)) {
    // 플래너가 아닌 상품 (예: 명발굴 세션)은 기존 썸네일 이미지 사용
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.thumbnailImage}
        alt={product.name}
        width={size}
        height={size}
        className="object-cover rounded-xl"
      />
    );
  }

  const opts = {
    orientation: 'portrait' as const,
    year: PLANNER_YEAR,
    theme: product.previewTheme ?? 'rose',
    coverStyle: product.coverStyle,
    mode: (product.coverStyle === 'practice' ? 'practice' : 'fortune') as 'fortune' | 'practice',
    name: product.slug.startsWith('saju-') ? '홍길동' : '나의 플래너',
    saju: product.slug.startsWith('saju-') ? SAMPLE_SAJU : undefined,
  };

  return (
    <PlannerPreviewCanvas
      pageType="cover"
      pageIdx={0}
      opts={opts}
      displayWidth={size}
      className=""
    />
  );
}
