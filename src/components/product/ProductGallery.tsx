'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Props {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);

  const prev = () => setActiveIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="flex flex-col gap-4">
      {/* 메인 이미지 */}
      <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-indigo-50 shadow-sm">
        <Image
          src={images[activeIdx]}
          alt={`${productName} 미리보기 ${activeIdx + 1}`}
          fill
          className="object-contain p-4"
          priority={activeIdx === 0}
          sizes="(max-width: 768px) 100vw, 50vw"
        />

        {/* 좌우 화살표 */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow transition-all"
              aria-label="이전 이미지"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-white/80 hover:bg-white rounded-full shadow transition-all"
              aria-label="다음 이미지"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* 이미지 카운터 */}
        <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-black/40 text-white text-xs rounded-full">
          {activeIdx + 1} / {images.length}
        </div>
      </div>

      {/* 썸네일 스트립 */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                idx === activeIdx
                  ? 'border-[#f0c040] shadow-md'
                  : 'border-gray-200 hover:border-indigo-300'
              }`}
              aria-label={`이미지 ${idx + 1}`}
            >
              <Image
                src={src}
                alt={`${productName} 썸네일 ${idx + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
