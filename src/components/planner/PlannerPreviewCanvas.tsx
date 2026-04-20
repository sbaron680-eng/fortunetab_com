'use client';

/**
 * PlannerPreviewCanvas
 * pdf-generator.ts 의 renderPreviewPage를 사용해 실시간으로 캔버스를 렌더링.
 * PDF 출력과 항상 동일한 화면을 보장합니다.
 */

import { useEffect, useRef, useState } from 'react';
import type { PageType, PlannerOptions } from '@/lib/pdf-generator';

// A4 비율 기준 캔버스 해상도
const BASE_W = 1240;
const BASE_H = 1754;
const BASE_W_L = 1754;
const BASE_H_L = 1240;

interface Props {
  pageType: PageType;
  pageIdx?: number;            // month 0-11 | week 1-52 (기본값 0 or 1)
  opts: Omit<PlannerOptions, 'onProgress' | 'pages'>;
  displayWidth?: number;       // 표시 너비 (px), 기본 280
  className?: string;
}

export default function PlannerPreviewCanvas({
  pageType,
  pageIdx,
  opts,
  displayWidth = 280,
  className = '',
}: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  const isL          = opts.orientation === 'landscape';
  const cw           = isL ? BASE_W_L : BASE_W;
  const ch           = isL ? BASE_H_L : BASE_H;
  const scale        = displayWidth / cw;
  const displayH     = Math.round(ch * scale);
  const idx          = pageIdx ?? (pageType === 'weekly' ? 1 : 0);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(false);

    (async () => {
      try {
        // 폰트 로드 대기
        if (typeof document !== 'undefined') {
          await document.fonts.ready;
        }
        if (cancelled) return;

        const { renderPreviewPage } = await import('@/lib/pdf-generator');
        if (cancelled || !canvasRef.current) return;

        canvasRef.current.width  = cw;
        canvasRef.current.height = ch;
        renderPreviewPage(canvasRef.current, pageType, idx, {
          ...opts,
          pages: [pageType],
        });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageType, idx, opts.theme, opts.year, opts.orientation, opts.name, opts.mode, opts.coverStyle ?? '', opts.fortuneData?.type ?? '', opts.fortuneData?.yearSummary ?? '', opts.saju?.yearPillar ?? '', opts.saju?.dayPillar ?? '', cw, ch]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg shadow-md bg-[#faf5f0] ${className}`}
      style={{ width: displayWidth, height: displayH, flexShrink: 0 }}
    >
      {/* 로딩 스켈레톤 */}
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
          <span className="text-xs text-gray-400">렌더링 중…</span>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <span className="text-xs text-red-400">미리보기 오류</span>
        </div>
      )}

      {/* 실제 캔버스 — transform으로 축소 */}
      <canvas
        ref={canvasRef}
        width={cw}
        height={ch}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: cw,
          height: ch,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          opacity: ready ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      />
    </div>
  );
}
