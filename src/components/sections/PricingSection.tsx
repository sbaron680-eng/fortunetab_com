'use client'

import { useState } from 'react'
import { PLANS, Plan, COPY } from '@/lib/constants'
import PlanCard from '@/components/ui/PlanCard'
import FakeDoorModal from '@/components/ui/FakeDoorModal'

export default function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [showModal, setShowModal] = useState(false)

  function handlePurchaseClick(plan: Plan) {
    setSelectedPlan(plan)
    setShowModal(true)
  }

  function handleModalClose() {
    setShowModal(false)
    setSelectedPlan(null)
  }

  function handleModalSignupClick() {
    setShowModal(false)
    document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <section
        id="pricing"
        style={{ padding: '80px 16px' }}
      >
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p
              style={{
                color: 'var(--color-gold)',
                fontSize: '13px',
                fontWeight: '500',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              {COPY.pricing.sectionLabel}
            </p>
            <h2
              style={{
                fontSize: 'clamp(24px, 4vw, 36px)',
                fontWeight: '700',
                color: 'var(--color-warm-white)',
                marginBottom: '12px',
              }}
            >
              {COPY.pricing.headline}
            </h2>
            <p style={{ color: 'rgba(254,252,232,0.6)' }}>
              {COPY.pricing.subheadline}
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            {PLANS.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onPurchaseClick={handlePurchaseClick}
              />
            ))}
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'rgba(254,252,232,0.3)',
              fontSize: '12px',
              marginTop: '32px',
            }}
          >
            * 현재 베타 준비 중입니다. 실제 결제는 출시 후 진행됩니다.
          </p>
        </div>
      </section>

      <FakeDoorModal
        isOpen={showModal}
        planName={selectedPlan?.name ?? ''}
        onClose={handleModalClose}
        onSignupClick={handleModalSignupClick}
      />
    </>
  )
}
