'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice } = useCartStore();
  const [mounted, setMounted] = useState(false);

  // zustand persist hydration 대기
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="text-7xl mb-6">🛒</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">장바구니가 비어 있습니다</h1>
        <p className="text-gray-500 mb-8">마음에 드는 플래너를 담아보세요!</p>
        <Link
          href="/products"
          className="px-8 py-4 font-bold text-white bg-[#1e1b4b] rounded-2xl hover:bg-indigo-800 transition-colors shadow-lg"
        >
          플래너 보러 가기 →
        </Link>
      </div>
    );
  }

  const shipping = 0; // 디지털 상품: 배송비 없음
  const total = totalPrice();
  const hasPaidItem = items.some((i) => i.product.price > 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-[#1e1b4b]">장바구니</h1>
          <p className="mt-1 text-sm text-gray-500">총 {totalItems()}개의 상품</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── 상품 목록 ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* 전체 삭제 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={clearCart}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                전체 삭제
              </button>
            </div>

            {items.map(({ product, qty }) => {
              const lineTotal = product.price * qty;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5 flex gap-4"
                >
                  {/* 썸네일 */}
                  <Link
                    href={`/products/${product.slug}`}
                    className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-indigo-50"
                  >
                    <Image
                      src={product.thumbnailImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </Link>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-semibold text-gray-900 hover:text-indigo-700 transition-colors text-sm sm:text-base"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-400 line-clamp-1">
                          {product.shortDescription}
                        </p>
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => removeItem(product.id)}
                        className="flex-shrink-0 p-1 text-gray-300 hover:text-red-400 transition-colors"
                        aria-label="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* 수량 조절 */}
                      {product.price > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQty(product.id, qty - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
                          >
                            −
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{qty}</span>
                          <button
                            onClick={() => updateQty(product.id, qty + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          무료
                        </span>
                      )}

                      {/* 금액 */}
                      <div className="text-right">
                        {product.price > 0 ? (
                          <>
                            <p className="text-base font-bold text-[#1e1b4b]">
                              {formatPrice(lineTotal)}
                            </p>
                            {qty > 1 && (
                              <p className="text-xs text-gray-400">{formatPrice(product.price)} × {qty}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-base font-bold text-emerald-600">무료</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* 쇼핑 계속하기 */}
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                ← 쇼핑 계속하기
              </Link>
            </div>
          </div>

          {/* ── 주문 요약 ──────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sticky top-24">
              <h2 className="font-bold text-gray-900 text-base mb-4">주문 요약</h2>

              <div className="space-y-3 text-sm">
                {items.map(({ product, qty }) => (
                  <div key={product.id} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2 flex-1">{product.name}</span>
                    <span className="flex-shrink-0 font-medium">
                      {product.price > 0 ? formatPrice(product.price * qty) : '무료'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="my-4 border-t border-gray-100" />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>소계</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>배송비</span>
                  <span className="text-emerald-600 font-medium">
                    {shipping === 0 ? '무료 (디지털)' : formatPrice(shipping)}
                  </span>
                </div>
              </div>

              <div className="my-4 border-t border-gray-100" />

              <div className="flex justify-between items-baseline mb-5">
                <span className="font-bold text-gray-900">합계</span>
                <span className="text-2xl font-black text-[#1e1b4b]">{formatPrice(total)}</span>
              </div>

              {hasPaidItem ? (
                <Link
                  href="/checkout"
                  className="block w-full text-center py-4 font-bold text-[#1e1b4b] bg-[#f0c040] rounded-2xl hover:bg-[#e0b030] transition-all shadow hover:shadow-md"
                >
                  결제하기 →
                </Link>
              ) : (
                <Link
                  href="/checkout"
                  className="block w-full text-center py-4 font-bold text-white bg-emerald-600 rounded-2xl hover:bg-emerald-700 transition-all shadow hover:shadow-md"
                >
                  무료 신청하기 →
                </Link>
              )}

              {/* 안내 */}
              <ul className="mt-4 space-y-1.5 text-xs text-gray-400">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  PDF 디지털 상품 · 즉시 이메일 발송
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  A4 고화질 · 인쇄·태블릿 모두 가능
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 flex-shrink-0">✓</span>
                  안전한 Toss Payments 결제
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
