'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Props {
  src: string;
  label: string;
}

export default function PreviewImageCard({ src, label }: Props) {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="relative rounded-xl overflow-hidden group"
      style={{ border: '1px solid rgba(240,192,64,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
    >
      <div className="relative aspect-[3/4] bg-[#1e1b4b]">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center text-indigo-400 text-xs text-center px-2">
            {label} 미리보기
          </div>
        ) : (
          <Image
            src={src}
            alt={`${label} 플래너 미리보기`}
            fill
            priority
            loading="eager"
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, 20vw"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <span className="text-white text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}
