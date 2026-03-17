'use client';

/**
 * PlannerProductPreview
 * 상품 페이지의 플래너 갤러리 — 정적 이미지 대신 실시간 캔버스 렌더링.
 * PDF 내용과 항상 일치합니다.
 */

import { useState } from 'react';
import PlannerPreviewCanvas from '@/components/planner/PlannerPreviewCanvas';
import type { PageType } from '@/lib/pdf-generator';

const PAGES: { type: PageType; label: string; icon: string; idx: number }[] = [
  { type: 'cover',      label: '커버',    icon: '🌙', idx: 0 },
  { type: 'year-index', label: '연간',    icon: '📅', idx: 0 },
  { type: 'monthly',    label: '월간',    icon: '🗓️', idx: 0 },
  { type: 'weekly',     label: '주간',    icon: '📋', idx: 1 },
  { type: 'daily',      label: '일간',    icon: '✏️', idx: 0 },
];

interface Props {
  year?: number;
  theme?: string;
}

export default function PlannerProductPreview({ year = 2026, theme = 'rose' }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const active = PAGES[activeIdx];

  const prev = () => setActiveIdx((i) => (i === 0 ? PAGES.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === PAGES.length - 1 ? 0 : i + 1));

  const opts = { orientation: 'portrait' as const, year, theme, name: '나의 플래너' };

  return (
    <div className="flex flex-col gap-4">
      {/* 메인 미리보기 */}
      <div className="relative flex items-center justify-center rounded-2xl overflow-hidden bg-indigo-50 shadow-sm p-4"
           style={{ aspectRatio: '3/4' }}>
        {/* 좌우 화살표 */}
        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow transition-all"
          aria-label="이전 페이지"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <PlannerPreviewCanvas
          pageType={active.type}
          pageIdx={active.idx}
          opts={opts}
          displayWidth={220}
          className="mx-auto"
        />

        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow transition-all"
          aria-label="다음 페이지"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* 페이지 라벨 */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/40 text-white text-xs rounded-full">
          {active.icon} {active.label} {activeIdx + 1}/{PAGES.length}
        </div>
      </div>

      {/* 썸네일 탭 */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PAGES.map(({ type, label, icon, idx }, i) => (
          <button
            key={type}
            onClick={() => setActiveIdx(i)}
            className={`flex flex-col items-center gap-1 flex-shrink-0 rounded-xl border-2 p-1.5 transition-all ${
              i === activeIdx
                ? 'border-[#f0c040] shadow-md bg-amber-50'
                : 'border-gray-200 hover:border-indigo-300 bg-white'
            }`}
            aria-label={`${label} 미리보기`}
          >
            <PlannerPreviewCanvas
              pageType={type}
              pageIdx={idx}
              opts={opts}
              displayWidth={56}
            />
            <span className="text-xs text-gray-500">{icon} {label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center">
        실제 생성되는 PDF와 동일한 미리보기입니다
      </p>
    </div>
  );
}
