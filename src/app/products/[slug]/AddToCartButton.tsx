'use client';

import { useState } from 'react';
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
        <button
          onClick={handleAdd}
          className={`w-full py-4 font-bold rounded-2xl transition-all ${
            added
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {added ? '✓ 신청 완료! 이메일을 확인하세요' : '무료로 받기'}
        </button>
        <p className="text-xs text-gray-400 text-center">이메일 주소로 즉시 다운로드 링크를 보내드립니다</p>
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
