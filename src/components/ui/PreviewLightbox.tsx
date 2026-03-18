'use client';

import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label?: string;
}

export default function PreviewLightbox({ open, onClose, children, label }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-2xl overflow-hidden max-w-lg w-full">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          {label && (
            <span className="text-sm font-semibold text-gray-700">{label}</span>
          )}
          <button
            onClick={onClose}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex items-center justify-center p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
