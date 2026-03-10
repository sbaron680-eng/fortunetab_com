'use client'

import { useEffect } from 'react'
import { COPY } from '@/lib/constants'

interface FakeDoorModalProps {
  isOpen: boolean
  planName: string
  onClose: () => void
  onSignupClick: () => void
}

export default function FakeDoorModal({
  isOpen,
  planName,
  onClose,
  onSignupClick,
}: FakeDoorModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'fade-in 0.2s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '384px',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          backgroundColor: 'var(--color-indigo-mid)',
          border: '1px solid rgba(245,158,11,0.3)',
          animation: 'slide-up 0.3s ease-out',
        }}
      >
        <button
          onClick={onClose}
          aria-label="닫기"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: 'rgba(254,252,232,0.6)',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            lineHeight: 1,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ×
        </button>

        <p style={{ fontSize: '48px', marginBottom: '16px' }}>🌙</p>
        <h2
          id="modal-title"
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: 'var(--color-gold)',
            marginBottom: '8px',
          }}
        >
          {COPY.pricing.modalTitle}
        </h2>
        <p
          style={{
            color: 'rgba(254,252,232,0.8)',
            whiteSpace: 'pre-line',
            marginBottom: '24px',
            lineHeight: 1.7,
          }}
        >
          {COPY.pricing.modalBody}
        </p>
        <p style={{ color: 'rgba(254,252,232,0.5)', fontSize: '14px', marginBottom: '24px' }}>
          선택하신 플랜: {planName}
        </p>

        <button
          onClick={onSignupClick}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '12px',
            backgroundColor: 'var(--color-gold)',
            color: 'var(--color-indigo-deep)',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            marginBottom: '12px',
            fontSize: '16px',
            fontFamily: 'inherit',
            transition: 'background-color 0.2s',
          }}
        >
          {COPY.pricing.modalCtaText}
        </button>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '8px',
            color: 'rgba(254,252,232,0.6)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
            transition: 'color 0.2s',
          }}
        >
          {COPY.pricing.modalCloseText}
        </button>
      </div>
    </div>
  )
}
