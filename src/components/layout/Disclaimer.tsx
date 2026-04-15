'use client';

import { useI18n } from '@/lib/i18n/client';

export default function Disclaimer() {
  const { t } = useI18n();

  return (
    <div className="bg-ft-paper-alt border-t border-ft-border px-4 py-2.5 text-center">
      <p className="text-xs text-ft-muted">{t.legal.disclaimer}</p>
    </div>
  );
}
