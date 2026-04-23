import { getDictionary } from '@/lib/i18n/server';

export default async function Disclaimer() {
  const t = await getDictionary('ko');
  return (
    <div className="bg-ft-paper-alt border-t border-ft-border px-4 py-2.5 text-center">
      <p className="text-xs text-ft-muted">{t.legal.disclaimer}</p>
    </div>
  );
}
