'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export interface BirthFormData {
  date: string;
  hour?: number;
  minute?: number;
  gender: 'male' | 'female';
  location?: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

interface Props {
  onSubmit: (data: BirthFormData) => void;
  loading?: boolean;
  initialData?: Partial<BirthFormData>;
}

export default function BirthDataForm({ onSubmit, loading, initialData }: Props) {
  const { t } = useI18n();
  const [date, setDate] = useState(initialData?.date ?? '');
  const [hour, setHour] = useState<string>(initialData?.hour?.toString() ?? '');
  const [timeUnknown, setTimeUnknown] = useState(!initialData?.hour && initialData?.hour !== 0);
  const [gender, setGender] = useState<'male' | 'female' | ''>(initialData?.gender ?? '');
  const [locationName, setLocationName] = useState(initialData?.location?.name ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date) { setError(t.fortune.birthData.date); return; }
    if (!gender) { setError(t.fortune.birthData.gender); return; }

    const data: BirthFormData = {
      date,
      gender,
    };

    if (!timeUnknown && hour !== '') {
      const h = parseInt(hour, 10);
      if (h >= 0 && h <= 23) data.hour = h;
    }

    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-lg font-bold text-ft-ink">{t.fortune.birthData.title}</h2>

      {/* Date */}
      <Input
        label={t.fortune.birthData.date}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
        max="2025-12-31"
        min="1900-01-01"
      />

      {/* Time */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ft-body">
          {t.fortune.birthData.time}
        </label>
        <div className="flex items-center gap-3">
          <select
            value={timeUnknown ? '' : hour}
            onChange={(e) => {
              setHour(e.target.value);
              setTimeUnknown(false);
            }}
            disabled={timeUnknown}
            className="flex-1 px-3 py-2 text-sm border border-ft-border rounded-lg bg-white
              focus:outline-none focus:ring-2 focus:ring-ft-navy/20 disabled:opacity-50"
          >
            <option value="">--</option>
            {Array.from({ length: 24 }, (_, i) => (
              <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-ft-body cursor-pointer">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => {
                setTimeUnknown(e.target.checked);
                if (e.target.checked) setHour('');
              }}
              className="rounded border-ft-border"
            />
            {t.fortune.birthData.timeUnknown}
          </label>
        </div>
      </div>

      {/* Gender */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-ft-body">
          {t.fortune.birthData.gender}
        </label>
        <div className="flex gap-3">
          {(['male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGender(g)}
              className={`
                flex-1 py-2.5 text-sm font-medium rounded-xl border transition-colors
                ${gender === g
                  ? 'bg-ft-ink text-white border-ft-ink'
                  : 'bg-white text-ft-body border-ft-border hover:bg-ft-paper-alt'
                }
              `}
            >
              {g === 'male' ? t.fortune.birthData.male : t.fortune.birthData.female}
            </button>
          ))}
        </div>
      </div>

      {/* Location (optional) */}
      <Input
        label={t.fortune.birthData.location}
        placeholder={t.fortune.birthData.locationPlaceholder}
        value={locationName}
        onChange={(e) => setLocationName(e.target.value)}
      />

      {error && <p className="text-sm text-ft-red">{error}</p>}

      <Button type="submit" size="lg" loading={loading} className="w-full">
        {t.common.next}
      </Button>
    </form>
  );
}
