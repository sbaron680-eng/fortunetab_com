'use client';

import { useI18n } from '@/lib/i18n/client';

export default function StreamingIndicator() {
  const { t } = useI18n();

  return (
    <div className="flex justify-start animate-step-in">
      <div className="bg-white border border-ft-border rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 bg-ft-muted rounded-full"
                style={{ animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
              />
            ))}
          </div>
          <span className="text-xs text-ft-muted">{t.chat.thinking}</span>
        </div>
      </div>
    </div>
  );
}
