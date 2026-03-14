'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/lib/store';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export default function AddToCartButton({ product }: Props) {
  const { addItem } = useCartStore();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (!product.inStock) {
    return (
      <button disabled className="w-full py-4 font-bold text-gray-400 bg-gray-100 rounded-2xl cursor-not-allowed">
        품절
      </button>
    );
  }

  if (product.price === 0) {
    return (
      <div className="space-y-3">
        <Link
          href="/download"
          className="block w-full py-4 text-center font-bold bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 shadow-lg hover:shadow-xl transition-all"
        >
          무료 다운로드 →
        </Link>
        <p className="text-xs text-gray-400 text-center">브라우저에서 즉시 PDF 생성 — 이메일 없이 바로 다운로드</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        className={`w-full py-4 font-bold rounded-2xl transition-all ${
          added
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
            : 'bg-[#1e1b4b] text-white hover:bg-indigo-800 shadow-lg hover:shadow-xl hover:-translate-y-0.5'
        }`}
      >
        {added ? '✓ 장바구니에 담겼습니다' : '장바구니에 담기'}
      </button>
      <a
        href="/checkout"
        onClick={() => addItem(product)}
        className="block w-full py-4 text-center font-bold text-[#1e1b4b] bg-[#f0c040] rounded-2xl hover:bg-[#e0b030] transition-all shadow hover:shadow-md"
      >
        바로 구매하기
      </a>
    </div>
  );
}
