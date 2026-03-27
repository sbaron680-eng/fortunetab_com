'use client';

import Link from 'next/link';
import { useCartStore, useToastStore } from '@/lib/store';
import { formatPrice, PLANNER_YEAR } from '@/lib/products';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import type { Product } from '@/types';

const BADGE_STYLES: Record<string, string> = {
  green: 'bg-ft-red text-white',
  gold:  'bg-ft-red text-white',
  red:   'bg-ft-ink text-white',
  blue:  'bg-ft-ink text-white',
};

interface Props {
  product: Product;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: Props) {
  const { addItem } = useCartStore();
  const { show: showToast } = useToastStore();
  const discountRate =
    product.originalPrice && product.originalPrice > 0
      ? Math.round((1 - product.price / product.originalPrice) * 100)
      : null;

  return (
    <div className="group relative bg-white overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-ft-border border-l-4 border-l-ft-red flex flex-col hover:-translate-y-1 rounded-r-2xl">
      {/* 배지 */}
      {product.badge && (
        <span
          className={`absolute top-3 left-3 z-10 px-2.5 py-0.5 text-xs font-bold rounded-full ${
            BADGE_STYLES[product.badgeColor] ?? 'bg-gray-500 text-white'
          }`}
        >
          {product.badge}
        </span>
      )}

      {/* 상품 미리보기 — 실시간 캔버스 렌더링 */}
      <Link href={`/products/${product.slug}`} className="block overflow-hidden bg-[#0f0e17]">
        <div className="flex items-center justify-center py-6 group-hover:scale-[1.03] transition-transform duration-500">
          <PlannerPreviewCanvas
            pageType="cover"
            opts={{ orientation: 'portrait', year: PLANNER_YEAR, theme: product.previewTheme ?? 'rose', name: '' }}
            displayWidth={180}
            className="shadow-xl"
          />
        </div>
      </Link>

      {/* 정보 영역 */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-serif font-semibold text-ft-ink text-base leading-snug group-hover:text-ft-ink-mid transition-colors">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-ft-muted line-clamp-2">{product.shortDescription}</p>
        </Link>

        {/* 가격 */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-ft-ink">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > 0 && (
            <>
              <span className="text-sm text-ft-muted line-through">
                {formatPrice(product.originalPrice)}
              </span>
              {discountRate && (
                <span className="text-sm font-bold text-ft-red">{discountRate}%</span>
              )}
            </>
          )}
        </div>

        {/* 구매 버튼 */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 text-center py-2.5 text-sm font-medium border border-ft-border text-ft-body rounded-xl hover:bg-ft-paper-alt transition-colors"
          >
            상세보기
          </Link>
          {product.price === 0 ? (
            <Link
              href="/download"
              className="flex-1 py-2.5 text-sm font-bold bg-ft-red text-white rounded-xl hover:bg-ft-red-h transition-colors text-center"
            >
              무료 다운로드
            </Link>
          ) : (
            <button
              onClick={() => { addItem(product); showToast(`${product.name}을(를) 담았습니다`); }}
              disabled={!product.inStock}
              className="flex-1 py-2.5 text-sm font-bold bg-ft-red text-white rounded-xl hover:bg-ft-red-h transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.inStock ? '담기' : '품절'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
