'use client'

import { Plan, COPY } from '@/lib/constants'
import { trackPriceButtonClick } from '@/lib/analytics'

interface PlanCardProps {
  plan: Plan
  onPurchaseClick: (plan: Plan) => void
}

export default function PlanCard({ plan, onPurchaseClick }: PlanCardProps) {
  function handleClick() {
    trackPriceButtonClick(plan.gaName, plan.price)
    onPurchaseClick(plan)
  }

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        border: plan.highlighted
          ? '1px solid var(--color-gold)'
          : '1px solid rgba(254,252,232,0.1)',
        backgroundColor: plan.highlighted
          ? 'var(--color-indigo-mid)'
          : 'rgba(30,27,75,0.6)',
        boxShadow: plan.highlighted
          ? '0 20px 60px rgba(245,158,11,0.2)'
          : 'none',
        transform: plan.highlighted ? 'scale(1.02)' : 'scale(1)',
        transition: 'all 0.2s',
      }}
    >
      {plan.badge && (
        <span
          style={{
            position: 'absolute',
            top: '-12px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 16px',
            borderRadius: '9999px',
            backgroundColor: 'var(--color-gold)',
            color: 'var(--color-indigo-deep)',
            fontSize: '14px',
            fontWeight: '700',
            whiteSpace: 'nowrap',
          }}
        >
          {plan.badge}
        </span>
      )}

      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-warm-white)', marginBottom: '4px' }}>
          {plan.name}
        </h3>
        <p style={{ fontSize: '30px', fontWeight: '700', color: 'var(--color-gold)' }}>
          {plan.priceFormatted}
        </p>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {plan.features.map((feature, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'rgba(254,252,232,0.8)', fontSize: '14px' }}>
            <span style={{ color: 'var(--color-gold)', marginTop: '2px', flexShrink: 0 }}>✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={handleClick}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '14px',
          border: plan.highlighted ? 'none' : '2px solid var(--color-gold)',
          backgroundColor: plan.highlighted ? 'var(--color-gold)' : 'transparent',
          color: plan.highlighted ? 'var(--color-indigo-deep)' : 'var(--color-gold)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontFamily: 'inherit',
        }}
      >
        {COPY.pricing.ctaButton}
      </button>
    </div>
  )
}
