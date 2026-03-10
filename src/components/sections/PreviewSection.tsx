import { COPY } from '@/lib/constants'

export default function PreviewSection() {
  return (
    <section
      id="preview"
      style={{
        padding: '80px 16px',
        backgroundColor: 'rgba(49,46,129,0.2)',
      }}
    >
      <div style={{ maxWidth: '768px', margin: '0 auto', textAlign: 'center' }}>
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
          {COPY.preview.sectionLabel}
        </p>
        <h2
          style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: '700',
            color: 'var(--color-warm-white)',
            marginBottom: '40px',
          }}
        >
          {COPY.preview.headline}
        </h2>

        {/* Planner preview placeholder */}
        {/* TODO: Replace with real planner screenshot image when design is ready */}
        <div
          style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 25px 80px rgba(245,158,11,0.1)',
            aspectRatio: '4/3',
            maxWidth: '640px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, var(--color-indigo-mid), var(--color-indigo-deep))',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}
        >
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>🌙</p>
          <p style={{ color: 'rgba(254,252,232,0.6)', fontSize: '14px', marginBottom: '8px' }}>
            플래너 미리보기 준비 중
          </p>
          <p style={{ color: 'rgba(254,252,232,0.3)', fontSize: '12px' }}>
            실제 화면은 출시 시 공개됩니다
          </p>

          {/* Decorative grid */}
          <div
            aria-hidden="true"
            style={{
              marginTop: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              width: '100%',
              maxWidth: '280px',
              opacity: 0.25,
            }}
          >
            {Array.from({ length: 35 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '1',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-gold)',
                }}
              />
            ))}
          </div>
        </div>

        <p style={{ marginTop: '24px', color: 'rgba(254,252,232,0.4)', fontSize: '14px' }}>
          {COPY.preview.caption}
        </p>
      </div>
    </section>
  )
}
