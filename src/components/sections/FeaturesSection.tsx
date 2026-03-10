import { COPY } from '@/lib/constants'

export default function FeaturesSection() {
  return (
    <section
      id="features"
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
            {COPY.features.sectionLabel}
          </p>
          <h2
            style={{
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: '700',
              color: 'var(--color-warm-white)',
              whiteSpace: 'pre-line',
            }}
          >
            {COPY.features.headline}
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
          }}
        >
          {COPY.features.items.map((item, index) => (
            <div
              key={index}
              style={{
                borderRadius: '16px',
                padding: '24px',
                backgroundColor: 'rgba(30,27,75,0.5)',
                border: '1px solid rgba(254,252,232,0.1)',
                transition: 'all 0.3s',
              }}
            >
              <span aria-hidden="true" style={{ fontSize: '32px', display: 'block', marginBottom: '16px' }}>{item.icon}</span>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-warm-white)', marginBottom: '8px', lineHeight: 1.4 }}>
                {item.title}
              </h3>
              <p style={{ color: 'rgba(254,252,232,0.6)', fontSize: '14px', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
