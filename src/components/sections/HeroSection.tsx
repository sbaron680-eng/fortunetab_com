import EmailSignupForm from '@/components/ui/EmailSignupForm'
import { COPY } from '@/lib/constants'

export default function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 16px',
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Radial gradient background glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 30%, rgba(99,102,241,0.3) 0%, transparent 70%), var(--color-indigo-deep)`,
        }}
      />

      {/* Decorative stars */}
      <span aria-hidden="true" style={{ position: 'absolute', top: '32px', left: '32px', color: 'rgba(245,158,11,0.3)', fontSize: '24px', userSelect: 'none', zIndex: 1 }}>✦</span>
      <span aria-hidden="true" style={{ position: 'absolute', top: '64px', right: '48px', color: 'rgba(245,158,11,0.2)', fontSize: '18px', userSelect: 'none', zIndex: 1 }}>✦</span>
      <span aria-hidden="true" style={{ position: 'absolute', bottom: '96px', left: '64px', color: 'rgba(245,158,11,0.2)', fontSize: '14px', userSelect: 'none', zIndex: 1 }}>✦</span>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '672px', margin: '0 auto', animation: 'slide-up 0.6s ease-out' }}>
        <p
          style={{
            display: 'inline-block',
            padding: '4px 16px',
            borderRadius: '9999px',
            border: '1px solid rgba(245,158,11,0.4)',
            color: 'var(--color-gold)',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '24px',
          }}
        >
          🌙 2025 출시 예정
        </p>

        <h1
          style={{
            fontSize: 'clamp(32px, 6vw, 56px)',
            fontWeight: '700',
            color: 'var(--color-warm-white)',
            lineHeight: 1.2,
            whiteSpace: 'pre-line',
            marginBottom: '24px',
          }}
        >
          {COPY.hero.headline}
        </h1>

        <p
          style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'rgba(254,252,232,0.7)',
            whiteSpace: 'pre-line',
            lineHeight: 1.7,
            marginBottom: '40px',
            maxWidth: '512px',
            margin: '0 auto 40px',
          }}
        >
          {COPY.hero.subheadline}
        </p>

        <EmailSignupForm variant="hero" />

        <p style={{ marginTop: '16px', color: 'rgba(254,252,232,0.4)', fontSize: '14px' }}>
          {COPY.hero.ctaSubtext}
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(254,252,232,0.3)',
          animation: 'bounce 2s infinite',
          zIndex: 1,
        }}
      >
        ↓
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </section>
  )
}
