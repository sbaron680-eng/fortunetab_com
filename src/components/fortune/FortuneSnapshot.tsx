'use client';

import { useI18n } from '@/lib/i18n/client';
import Card from '@/components/ui/Card';

interface FortuneSnapshotProps {
  fortuneScore: number;
  fortunePercent: number;
  grade: { key: string; label: string; labelEn: string };
  dayElem: string;
  sunSign: string;
  moonSign: string;
}

const gradeColors: Record<string, string> = {
  optimal: 'text-green-600 bg-green-50',
  good: 'text-blue-600 bg-blue-50',
  neutral: 'text-ft-body bg-ft-paper-alt',
  rest: 'text-amber-600 bg-amber-50',
};

export default function FortuneSnapshot({
  fortunePercent,
  grade,
  dayElem,
  sunSign,
  moonSign,
}: FortuneSnapshotProps) {
  const { t, locale } = useI18n();
  const gradeLabel = locale === 'ko' ? grade.label : grade.labelEn;
  const colorClass = gradeColors[grade.key] ?? gradeColors.neutral;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-ft-ink">{t.fortune.score.title}</h3>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
          {gradeLabel}
        </span>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-bold text-ft-ink">{fortunePercent}%</span>
        </div>
        <div className="w-full h-2 bg-ft-paper-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-ft-ink rounded-full transition-all duration-500"
            style={{ width: `${fortunePercent}%` }}
          />
        </div>
      </div>

      {/* East + West summary */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ft-border">
        <div>
          <p className="text-xs text-ft-muted mb-0.5">{t.fortune.eastern}</p>
          <p className="text-sm font-medium text-ft-ink">
            {locale === 'ko' ? `일간 ${dayElem}` : `Day Master: ${dayElem}`}
          </p>
        </div>
        <div>
          <p className="text-xs text-ft-muted mb-0.5">{t.fortune.western}</p>
          <p className="text-sm font-medium text-ft-ink">
            {sunSign} / {moonSign}
          </p>
        </div>
      </div>
    </Card>
  );
}
