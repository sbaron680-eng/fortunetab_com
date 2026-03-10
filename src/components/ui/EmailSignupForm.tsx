'use client'

import { useState } from 'react'
import { COPY } from '@/lib/constants'
import { trackEmailSubmit } from '@/lib/analytics'

interface EmailSignupFormProps {
  variant?: 'hero' | 'footer'
}

interface FormState {
  email: string
  job: string
  reason: string
  emailError: string
  submitted: boolean
  loading: boolean
}

export default function EmailSignupForm({ variant = 'hero' }: EmailSignupFormProps) {
  const [state, setState] = useState<FormState>({
    email: '',
    job: '',
    reason: '',
    emailError: '',
    submitted: false,
    loading: false,
  })

  function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!validateEmail(state.email)) {
      setState(prev => ({ ...prev, emailError: COPY.form.errorEmail }))
      return
    }

    setState(prev => ({ ...prev, loading: true, emailError: '' }))

    // TODO: Backend integration — replace the timeout below with an API call, e.g.:
    //   await fetch('/api/subscribe', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ email: state.email, job: state.job, reason: state.reason }),
    //   })
    // Options: Mailchimp API, ConvertKit, Resend, Supabase, Google Sheets via Apps Script
    await new Promise(resolve => setTimeout(resolve, 600))

    trackEmailSubmit({
      job_category: state.job || undefined,
      has_reason: state.reason.length > 0,
    })

    setState(prev => ({ ...prev, loading: false, submitted: true }))
  }

  if (state.submitted) {
    return (
      <div className="text-center py-8" style={{ animation: 'fade-in 0.5s ease-out' }}>
        <p className="text-3xl mb-2">🌙</p>
        <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--color-gold)' }}>
          {COPY.form.successTitle}
        </h3>
        <p className="whitespace-pre-line" style={{ color: 'rgba(254,252,232,0.7)' }}>
          {COPY.form.successMessage}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md mx-auto space-y-3">
      <div>
        <input
          type="email"
          value={state.email}
          onChange={e => setState(prev => ({ ...prev, email: e.target.value, emailError: '' }))}
          placeholder={COPY.form.emailPlaceholder}
          aria-describedby={state.emailError ? 'email-error' : undefined}
          aria-invalid={!!state.emailError}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'var(--color-indigo-deep)',
            backgroundColor: 'var(--color-warm-white)',
            border: `2px solid ${state.emailError ? '#f87171' : 'transparent'}`,
            fontSize: '16px',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        {state.emailError && (
          <p id="email-error" style={{ marginTop: '4px', color: '#f87171', fontSize: '14px' }}>
            {state.emailError}
          </p>
        )}
      </div>

      <select
        value={state.job}
        onChange={e => setState(prev => ({ ...prev, job: e.target.value }))}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          color: 'var(--color-indigo-deep)',
          backgroundColor: 'rgba(254,252,232,0.9)',
          border: 'none',
          fontSize: '16px',
          outline: 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        {COPY.form.jobOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={state.reason}
        onChange={e => setState(prev => ({ ...prev, reason: e.target.value }))}
        placeholder={COPY.form.reasonPlaceholder}
        maxLength={200}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          color: 'var(--color-indigo-deep)',
          backgroundColor: 'rgba(254,252,232,0.9)',
          border: 'none',
          fontSize: '16px',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />

      <button
        type="submit"
        disabled={state.loading}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '18px',
          backgroundColor: state.loading ? 'rgba(245,158,11,0.6)' : 'var(--color-gold)',
          color: 'var(--color-indigo-deep)',
          border: 'none',
          cursor: state.loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        {state.loading ? '처리 중...' : COPY.form.submitButton}
      </button>
    </form>
  )
}
