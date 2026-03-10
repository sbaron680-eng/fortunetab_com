import { COPY } from '@/lib/constants'

export default function ProblemSection() {
  return (
    <section
      id="problem"
      style={{
        padding: '80px 16px',
        backgroundColor: 'rgba(49,46,129,0.2)',
      }}
    >
      <div style={{ maxWidth: '672px', margin: '0 auto' }}>
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
            {COPY.problem.sectionLabel}
          </p>
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: '700',
              color: 'var(--color-warm-white)',
            }}
          >
            {COPY.problem.headline}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {COPY.problem.points.map((point, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                padding: '20px',
                borderRadius: '12px',
                backgroundColor: 'rgba(254,252,232,0.05)',
                border: '1px solid rgba(254,252,232,0.1)',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '24px', flexShrink: 0, marginTop: '2px' }}>{point.icon}</span>
              <div>
                <h3 style={{ fontWeight: '700', color: 'var(--color-warm-white)', marginBottom: '4px' }}>
                  {point.title}
                </h3>
                <p style={{ color: 'rgba(254,252,232,0.6)', fontSize: '14px', lineHeight: 1.6 }}>
                  {point.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
