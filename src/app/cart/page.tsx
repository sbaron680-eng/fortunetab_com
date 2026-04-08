'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/products';
import { usePromotions } from '@/lib/usePromotions';

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, totalItems } = useCartStore();
  const { getPromo } = usePromotions();
  const getItemPrice = (slug: string, basePrice: number) => {
    const promo = getPromo(slug, basePrice);
    return promo.hasPromo ? promo.finalPrice : basePrice;
  };
  const [mounted, setMounted] = useState(false);

  // zustand persist hydration 대기
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-ft-paper">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl skeleton" />
          <div className="h-4 w-32 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-ft-paper flex flex-col items-center justify-center py-20 px-6 text-center animate-fade-in">
        <div className="w-24 h-24 mb-6 flex items-center justify-center bg-ft-paper-alt rounded-full">
          <svg className="w-12 h-12 text-ft-muted" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black font-serif text-ft-ink mb-2">장바구니가 비어 있습니다</h1>
        <p className="text-ft-muted mb-8">마음에 드는 플래너를 담아보세요!</p>
        <Link
          href="/products"
          className="px-8 py-4 font-bold text-white bg-ft-navy rounded-2xl hover:bg-ft-ink transition-colors shadow-lg hover-lift btn-press"
        >
          플래너 보러 가기 →
        </Link>
      </div>
    );
  }

  const shipping = 0; // 디지털 상품: 배송비 없음
  const total = items.reduce((sum, i) => sum + getItemPrice(i.product.slug, i.product.price) * i.qty, 0);
  const hasPaidItem = items.some((i) => getItemPrice(i.product.slug, i.product.price) > 0);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ft-paper py-20 px-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* 페이지 헤더 */}
        <div className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-black font-serif text-ft-ink">장바구니</h1>
          <p className="mt-2 text-sm text-ft-muted">총 {totalItems()}개의 상품</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── 상품 목록 ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* 전체 삭제 버튼 */}
            <div className="flex justify-end">
              <button
                onClick={clearCart}
                className="text-xs text-ft-muted hover:text-ft-red transition-colors btn-press"
              >
                전체 삭제
              </button>
            </div>

            {items.map(({ product, qty }) => {
              const lineTotal = getItemPrice(product.slug, product.price) * qty;
              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-ft-border p-4 sm:p-5 flex gap-4 hover-lift transition-all"
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
                      {/* 수량 (디지털 상품이므로 1개 고정) */}
                      {getItemPrice(product.slug, product.price) > 0 ? (
                        <span className="text-sm text-ft-muted">수량: 1</span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          무료
                        </span>
                      )}

                      {/* 금액 */}
                      <div className="text-right">
                        {getItemPrice(product.slug, product.price) > 0 ? (
                          <>
                            <p className="text-base font-bold text-[#1e1b4b]">
                              {formatPrice(lineTotal)}
                            </p>
                            {qty > 1 && (
                              <p className="text-xs text-gray-400">{formatPrice(getItemPrice(product.slug, product.price))} × {qty}</p>
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
                      {getItemPrice(product.slug, product.price) > 0 ? formatPrice(getItemPrice(product.slug, product.price) * qty) : '무료'}
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
                  안전한 결제 시스템
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
