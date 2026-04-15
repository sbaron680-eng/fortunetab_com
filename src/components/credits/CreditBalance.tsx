'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n/client';

export default function CreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch('/api/credits/balance', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBalance(data.balance);
        }
      } catch {
        // Silently fail — balance will show as null
      }
    })();
  }, []);

  if (balance === null) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <svg className="w-4 h-4 text-ft-muted" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
      </svg>
      <span className="font-medium text-ft-ink">{balance}</span>
      <span className="text-ft-muted">{t.credits.title}</span>
    </div>
  );
}
