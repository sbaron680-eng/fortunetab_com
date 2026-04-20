'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store';
import type { Product } from '@/types';

interface Props {
  product: Product;
}

export default function AddToCartButton({ product }: Props) {
  const router = useRouter();
  const { addItem, clearCart } = useCartStore();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    clearCart();
    addItem(product);
    // Zustand persist가 localStorage에 저장할 시간 확보 후 이동
    setTimeout(() => router.push('/checkout'), 100);
  };

  if (!product.inStock) {
    return (
      <button disabled className="w-full py-4 font-bold text-gray-400 bg-gray-100 rounded-2xl cursor-not-allowed">
        품절
      </button>
    );
  }

  if (product.price === 0) {
    // 각 무료 플래너는 개별 독립 라우트로 이동
    const pathMap: Record<string, string> = {
      'common-planner':   '/download',
      'practice-planner': '/download/practice',
      'extras-free':      '/download/extras',
    };
    const downloadUrl = pathMap[product.slug] || '/download';

    return (
      <div className="space-y-3">
        <Link
          href={downloadUrl}
          className="block w-full py-4 text-center font-bold bg-ft-gold text-ft-ink rounded-2xl hover:bg-ft-gold-h shadow-lg hover:shadow-xl transition-all btn-press"
        >
          무료 다운로드 →
        </Link>
        <p className="text-xs text-ft-muted text-center">브라우저에서 즉시 PDF 생성 — 이메일 없이 바로 다운로드</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleAdd}
        className={`w-full py-4 font-bold rounded-2xl transition-all ${
          added
            ? 'bg-ft-paper-alt text-ft-ink-mid border border-ft-border'
            : 'bg-ft-ink text-white hover:bg-ft-ink-mid shadow-lg hover:shadow-xl hover:-translate-y-0.5'
        } btn-press`}
      >
        {added ? '✓ 장바구니에 담겼습니다' : '장바구니에 담기'}
      </button>
      <button
        onClick={handleBuyNow}
        className="w-full py-4 font-bold text-ft-ink bg-ft-gold rounded-2xl hover:bg-ft-gold-h transition-all shadow hover:shadow-md btn-press"
      >
        바로 구매하기
      </button>
    </div>
  );
}
