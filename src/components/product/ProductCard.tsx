'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore, useToastStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import type { Product } from '@/types';

const BADGE_STYLES: Record<string, string> = {
  green: 'bg-emerald-500 text-white',
  gold: 'bg-[#f0c040] text-[#1e1b4b]',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
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
    <div className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col">
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

      {/* 상품 이미지 */}
      <Link href={`/products/${product.slug}`} className="block overflow-hidden bg-indigo-50">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={product.thumbnailImage}
            alt={product.name}
            fill
            priority={priority}
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      </Link>

      {/* 정보 영역 */}
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/products/${product.slug}`} className="block">
          <h3 className="font-semibold text-gray-900 text-base leading-snug group-hover:text-indigo-700 transition-colors">
            {product.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{product.shortDescription}</p>
        </Link>

        {/* 가격 */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xl font-bold text-[#1e1b4b]">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > 0 && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {formatPrice(product.originalPrice)}
              </span>
              {discountRate && (
                <span className="text-sm font-bold text-red-500">{discountRate}%</span>
              )}
            </>
          )}
        </div>

        {/* 구매 버튼 */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/products/${product.slug}`}
            className="flex-1 text-center py-2.5 text-sm font-medium border border-indigo-700 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors"
          >
            상세보기
          </Link>
          {product.price === 0 ? (
            <Link
              href="/download"
              className="flex-1 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-center"
            >
              무료 다운로드
            </Link>
          ) : (
            <button
              onClick={() => { addItem(product); showToast(`${product.name}을(를) 담았습니다`); }}
              disabled={!product.inStock}
              className="flex-1 py-2.5 text-sm font-bold bg-[#1e1b4b] text-white rounded-xl hover:bg-indigo-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {product.inStock ? '담기' : '품절'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
