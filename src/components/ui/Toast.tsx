'use client';

import { useToastStore } from '@/lib/store';
import { useCartStore } from '@/lib/store';

export default function Toast() {
  const { message, hide } = useToastStore();
  const { openCart } = useCartStore();

  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium bg-ft-ink border border-ft-gold/30"
    >
      <span className="text-green-400 text-base">✓</span>
      <span className="text-white">{message}</span>
      <button
        onClick={() => { hide(); openCart(); }}
        className="ml-2 text-xs font-semibold text-[#f0c040] hover:text-[#e0b030] transition-colors whitespace-nowrap"
      >
        장바구니 보기 →
      </button>
    </div>
  );
}
