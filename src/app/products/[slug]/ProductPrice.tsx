'use client';

import { formatPrice } from '@/lib/products';
import { usePromotions } from '@/lib/usePromotions';

interface Props {
  slug: string;
  basePrice: number;
}

export default function ProductPrice({ slug, basePrice }: Props) {
  const { getPromo } = usePromotions();
  const promo = getPromo(slug, basePrice);
  const displayPrice = promo.hasPromo ? promo.finalPrice : basePrice;
  const displayOriginal = promo.hasPromo ? basePrice : null;

  return (
    <div className="mt-6 bg-ft-paper-alt border border-ft-border rounded-xl p-6">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-ft-ink">
          {formatPrice(displayPrice)}
        </span>
        {displayOriginal && displayOriginal > displayPrice && (
          <>
            <span className="text-base text-ft-muted line-through">
              {formatPrice(displayOriginal)}
            </span>
            {promo.discountPercent > 0 && (
              <span className="text-sm font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                {promo.discountPercent}% OFF
              </span>
            )}
          </>
        )}
      </div>
      {promo.badge && (
        <p className="mt-2 text-sm font-medium text-ft-red">{promo.badge}</p>
      )}
      {promo.daysRemaining !== null && promo.daysRemaining <= 7 && (
        <p className="mt-1 text-xs text-ft-muted">
          프로모션 종료까지 {promo.daysRemaining}일 남음
        </p>
      )}
    </div>
  );
}
