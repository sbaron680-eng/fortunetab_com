'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/client';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const PACKAGES = [
  { id: 'starter', credits: 10, priceKRW: '₩4,900', priceUSD: '$3.99', popular: false },
  { id: 'standard', credits: 30, priceKRW: '₩9,900', priceUSD: '$7.99', popular: true },
  { id: 'plus', credits: 80, priceKRW: '₩19,900', priceUSD: '$15.99', popular: false },
] as const;

const SUBSCRIPTIONS = [
  { id: 'pro_monthly', credits: 100, priceKRW: '₩14,900/mo', priceUSD: '$11.99/mo', period: 'monthly' },
  { id: 'pro_yearly', credits: 100, priceKRW: '₩119,000/yr', priceUSD: '$99.99/yr', period: 'yearly' },
] as const;

export default function CreditPackages() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { t, locale } = useI18n();

  const handlePurchase = async (packageId: string) => {
    setLoading(packageId);
    setError('');

    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in');
        return;
      }

      const res = await fetch('/api/payments/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ package: packageId, locale }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Purchase failed');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(null);
    }
  };

  const isKo = locale === 'ko';

  return (
    <div className="space-y-8">
      {/* One-time packages */}
      <div>
        <h3 className="text-sm font-semibold text-ft-muted uppercase tracking-wider mb-4">
          {isKo ? '일회성 크레딧' : 'One-Time Credits'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.id}
              className={`text-center ${pkg.popular ? 'border-ft-ink border-2 relative' : ''}`}
            >
              {pkg.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white bg-ft-ink px-3 py-0.5 rounded-full">
                  {isKo ? '인기' : 'Popular'}
                </span>
              )}
              <p className="text-sm font-medium text-ft-muted">
                {t.credits.packages[pkg.id as keyof typeof t.credits.packages]}
              </p>
              <p className="text-3xl font-bold text-ft-ink mt-2">{pkg.credits}</p>
              <p className="text-xs text-ft-muted mt-1">{t.credits.title}</p>
              <p className="text-lg font-semibold text-ft-ink mt-3">
                {isKo ? pkg.priceKRW : pkg.priceUSD}
              </p>
              <Button
                variant={pkg.popular ? 'primary' : 'secondary'}
                size="md"
                className="w-full mt-4"
                loading={loading === pkg.id}
                onClick={() => handlePurchase(pkg.id)}
              >
                {t.credits.buy}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Subscriptions */}
      <div>
        <h3 className="text-sm font-semibold text-ft-muted uppercase tracking-wider mb-4">
          {isKo ? 'Pro 구독' : 'Pro Subscription'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUBSCRIPTIONS.map((sub) => (
            <Card key={sub.id} className="text-center">
              <p className="text-sm font-medium text-ft-muted">
                {t.credits.packages[sub.id === 'pro_monthly' ? 'proMonthly' : 'proYearly']}
              </p>
              <p className="text-3xl font-bold text-ft-ink mt-2">{sub.credits}</p>
              <p className="text-xs text-ft-muted mt-1">
                {t.credits.noExpiry}
              </p>
              <p className="text-lg font-semibold text-ft-ink mt-3">
                {isKo ? sub.priceKRW : sub.priceUSD}
              </p>
              <Button
                variant="secondary"
                size="md"
                className="w-full mt-4"
                loading={loading === sub.id}
                onClick={() => handlePurchase(sub.id)}
              >
                {t.credits.buy}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {error && <p className="text-center text-sm text-ft-red">{error}</p>}
    </div>
  );
}
