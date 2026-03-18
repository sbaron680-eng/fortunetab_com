'use client';

import { useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { PRODUCTS } from '@/lib/products';
import type { Product } from '@/types';

type FilterId = 'all' | 'free' | 'basic' | 'premium';

const CATEGORIES: { id: FilterId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'free', label: '무료' },
  { id: 'basic', label: '기본' },
  { id: 'premium', label: '프리미엄' },
];

export default function ProductFilterGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  const filteredProducts: Product[] =
    activeFilter === 'all'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeFilter);

  return (
    <>
      {/* 카테고리 탭 */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {CATEGORIES.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveFilter(id)}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full border transition-colors ${
              activeFilter === id
                ? 'bg-[#1e1b4b] text-white border-[#1e1b4b]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 cursor-pointer'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 상품 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {/* 필터 결과 없음 */}
      {filteredProducts.length === 0 && (
        <p className="text-center text-gray-400 py-12">해당 카테고리의 상품이 없습니다.</p>
      )}
    </>
  );
}
