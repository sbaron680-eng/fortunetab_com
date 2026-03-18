'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';

export default function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const { items, isOpen, closeCart, removeItem, updateQty, totalPrice, totalItems } =
    useCartStore();

  useEffect(() => { setMounted(true); }, []);

  // ESC 키로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeCart]);

  // 열려 있을 때 body 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return (
    <>
      {/* 백드롭 */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeCart}
      />

      {/* 드로어 */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            장바구니
            {totalItems() > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({totalItems()}개)
              </span>
            )}
          </h2>
          <button
            onClick={closeCart}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-lg"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 아이템 목록 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="text-5xl mb-4">🛒</div>
              <p className="text-gray-500 text-sm">장바구니가 비어 있습니다.</p>
              <Link
                href="/products"
                onClick={closeCart}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-700 border border-indigo-700 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                상품 보러 가기
              </Link>
            </div>
          ) : (
            items.map(({ product, qty }) => (
              <div key={product.id} className="flex gap-3 py-3 border-b border-gray-50">
                {/* 썸네일 */}
                <div className="relative w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-indigo-50">
                  <Image
                    src={product.thumbnailImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatPrice(product.price)}</p>

                  {/* 수량 조절 */}
                  {product.price > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQty(product.id, qty - 1)}
                        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                      >
                        −
                      </button>
                      <span className="text-sm w-4 text-center">{qty}</span>
                      <button
                        onClick={() => updateQty(product.id, qty + 1)}
                        className="w-6 h-6 flex items-center justify-center border border-gray-300 rounded text-gray-600 hover:bg-gray-100 transition-colors text-sm"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {/* 삭제 */}
                <button
                  onClick={() => removeItem(product.id)}
                  className="self-start p-1 text-gray-300 hover:text-red-400 transition-colors"
                  aria-label="삭제"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* 합계 & 결제 버튼 */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">합계</span>
              <span className="text-xl font-bold text-[#1e1b4b]">
                {formatPrice(totalPrice())}
              </span>
            </div>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="block w-full text-center py-3.5 font-bold text-[#1e1b4b] bg-[#f0c040] rounded-xl hover:bg-[#e0b030] transition-colors"
            >
              결제하기
            </Link>
            <Link
              href="/cart"
              onClick={closeCart}
              className="block w-full text-center py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
            >
              장바구니 상세 보기
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
