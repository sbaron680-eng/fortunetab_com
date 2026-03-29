'use client';

import { useState, useEffect } from 'react';
import {
  fetchActivePromotions, getPromotionForProduct, applyPromotion, getDaysRemaining,
  type Promotion,
} from './promotions';

interface ProductPromo {
  finalPrice: number;
  originalPrice: number;
  discountPercent: number;
  badge: string | null;
  daysRemaining: number | null;
  hasPromo: boolean;
}

/**
 * 활성 프로모션을 조회하여 상품별 할인 정보를 반환하는 훅
 * 컴포넌트 마운트 시 1회 조회, 이후 캐시
 */
export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchActivePromotions().then(data => {
      setPromotions(data);
      setLoaded(true);
    });
  }, []);

  function getPromo(slug: string, basePrice: number): ProductPromo {
    if (!loaded || basePrice === 0) {
      return { finalPrice: basePrice, originalPrice: basePrice, discountPercent: 0, badge: null, daysRemaining: null, hasPromo: false };
    }
    const promo = getPromotionForProduct(slug, promotions);
    if (!promo) {
      return { finalPrice: basePrice, originalPrice: basePrice, discountPercent: 0, badge: null, daysRemaining: null, hasPromo: false };
    }
    // promo의 originalPrice는 products.ts의 originalPrice (정가)
    const { finalPrice, discountPercent, badge } = applyPromotion(basePrice, promo);
    const daysRemaining = getDaysRemaining(promo.ends_at);
    return { finalPrice, originalPrice: basePrice, discountPercent, badge, daysRemaining, hasPromo: true };
  }

  return { getPromo, loaded };
}
