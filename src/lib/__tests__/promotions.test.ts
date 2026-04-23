/**
 * Promotions 계산 회귀 테스트 — 2026-04-23 추가
 *
 * 2차 정밀 검토 M5(flat 할인 qty 무시) 회귀 방지.
 * confirm-payment Edge Function의 재계산 로직과 동일한 계약을 검증.
 */
import { describe, it, expect, vi } from 'vitest';

// supabase 클라이언트 생성 시 env var 참조로 테스트 환경에서 throw 가능 → 모듈 모킹.
vi.mock('../supabase', () => ({ supabase: {} }));

import { applyPromotion, calculateLineTotal, type Promotion } from '../promotions';

function makePromo(overrides: Partial<Promotion>): Promotion {
  return {
    id: 'test', product_slug: null, discount_type: 'percent', discount_value: 10,
    starts_at: '2024-01-01', ends_at: null, is_active: true, badge_text: null,
    created_at: '2024-01-01', updated_at: '2024-01-01',
    ...overrides,
  } as Promotion;
}

describe('applyPromotion', () => {
  it('null 프로모 → 변경 없음', () => {
    expect(applyPromotion(10000, null).finalPrice).toBe(10000);
  });

  it('퍼센트 10% → 9000원', () => {
    const r = applyPromotion(10000, makePromo({ discount_type: 'percent', discount_value: 10 }));
    expect(r.finalPrice).toBe(9000);
    expect(r.discountPercent).toBe(10);
  });

  it('fixed 3000원 → 7000원', () => {
    const r = applyPromotion(10000, makePromo({ discount_type: 'fixed', discount_value: 3000 }));
    expect(r.finalPrice).toBe(7000);
  });

  it('fixed 할인이 단가보다 크면 0으로 clamp', () => {
    const r = applyPromotion(1000, makePromo({ discount_type: 'fixed', discount_value: 5000 }));
    expect(r.finalPrice).toBe(0);
  });
});

describe('calculateLineTotal — qty 계산 (M5 회귀 방지)', () => {
  it('qty=1, 프로모 없음', () => {
    expect(calculateLineTotal(10000, 1, null)).toBe(10000);
  });

  it('qty=2, 프로모 없음 → 단가 × qty', () => {
    expect(calculateLineTotal(10000, 2, null)).toBe(20000);
  });

  it('qty=2, 퍼센트 10% → (단가 × 0.9) × qty', () => {
    const promo = makePromo({ discount_type: 'percent', discount_value: 10 });
    expect(calculateLineTotal(10000, 2, promo)).toBe(18000);
  });

  it('qty=2, fixed ₩5000 → (단가 - 5000) × qty — 1회만 차감 NOT 허용', () => {
    const promo = makePromo({ discount_type: 'fixed', discount_value: 5000 });
    // 올바른 계산: (10000 - 5000) × 2 = 10000
    // 버그 계산: (10000 × 2) - 5000 = 15000 — 이 값이 나오면 회귀
    expect(calculateLineTotal(10000, 2, promo)).toBe(10000);
  });

  it('qty=3, fixed ₩2000 → 단가당 차감 × 3', () => {
    const promo = makePromo({ discount_type: 'fixed', discount_value: 2000 });
    expect(calculateLineTotal(5000, 3, promo)).toBe(9000);
  });

  it('qty=undefined → 1로 간주', () => {
    expect(calculateLineTotal(10000, undefined as unknown as number, null)).toBe(10000);
  });
});
