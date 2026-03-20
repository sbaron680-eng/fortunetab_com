'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { PageType, Orientation } from '@/lib/pdf-generator';

const PlannerPreviewCanvas = dynamic(
  () => import('@/components/planner/PlannerPreviewCanvas'),
  { ssr: false, loading: () => <div className="w-[260px] h-[368px] bg-ft-paper-alt rounded-xl animate-pulse" /> }
);

const TABS: { type: PageType; label: string; idx: number }[] = [
  { type: 'cover',      label: '커버',  idx: 0 },
  { type: 'year-index', label: '연간',  idx: 0 },
  { type: 'monthly',    label: '월간',  idx: 1 },
  { type: 'weekly',     label: '주간',  idx: 1 },
  { type: 'daily',      label: '일간',  idx: 0 },
];

export default function PlannerPreviewSection() {
  const [active, setActive] = useState(0);
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const tab = TABS[active];

  // 가로형은 displayWidth를 넓혀 높이 확보
  const displayWidth = orientation === 'landscape' ? 360 : 260;

  const opts = {
    year: 2026,
    theme: 'rose' as const,
    orientation,
    name: '플래너 미리보기',
  };

  return (
    <div>
      {/* 탭 + 방향 버튼 */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="flex gap-2 justify-center flex-wrap">
          {TABS.map(({ label }, i) => (
            <button
              key={label}
              onClick={() => setActive(i)}
              className={`px-4 py-1.5 text-sm rounded-full border transition-all duration-200 ${
                active === i
                  ? 'bg-ft-ink text-white border-ft-ink'
                  : 'bg-white text-ft-muted border-ft-border hover:border-ft-ink/50 hover:text-ft-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* 가로/세로 전환 */}
        <div className="flex items-center gap-1 p-1 bg-ft-paper-alt rounded-full border border-ft-border">
          <button
            onClick={() => setOrientation('portrait')}
            className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
              orientation === 'portrait'
                ? 'bg-white text-ft-ink shadow-sm font-medium border border-ft-border'
                : 'text-ft-muted hover:text-ft-ink'
            }`}
          >
            ☐ 세로형
          </button>
          <button
            onClick={() => setOrientation('landscape')}
            className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
              orientation === 'landscape'
                ? 'bg-white text-ft-ink shadow-sm font-medium border border-ft-border'
                : 'text-ft-muted hover:text-ft-ink'
            }`}
          >
            ▭ 가로형
          </button>
        </div>
      </div>
      {/* 메인 미리보기 */}
      <div className="flex justify-center">
        <PlannerPreviewCanvas
          pageType={tab.type}
          pageIdx={tab.idx}
          opts={opts}
          displayWidth={displayWidth}
          className="rounded-xl overflow-hidden shadow-xl border border-ft-border"
        />
      </div>
    </div>
  );
}
