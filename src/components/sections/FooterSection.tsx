import EmailSignupForm from '@/components/ui/EmailSignupForm'
import { COPY } from '@/lib/constants'

export default function FooterSection() {
  return (
    <footer
      id="footer"
      style={{
        padding: '80px 16px',
        borderTop: '1px solid rgba(254,252,232,0.1)',
      }}
    >
      <div style={{ maxWidth: '512px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: '48px', marginBottom: '24px' }}>🌙</p>
        <h2
          style={{
            fontSize: 'clamp(20px, 3.5vw, 28px)',
            fontWeight: '700',
            color: 'var(--color-warm-white)',
            marginBottom: '12px',
          }}
        >
          {COPY.footer.ctaHeadline}
        </h2>
        <p style={{ color: 'rgba(254,252,232,0.6)', marginBottom: '40px' }}>
          {COPY.footer.ctaSubtext}
        </p>

        <EmailSignupForm variant="footer" />

        <p
          style={{
            marginTop: '48px',
            color: 'rgba(254,252,232,0.2)',
            fontSize: '12px',
          }}
        >
          {COPY.footer.copyright}
        </p>
      </div>
    </footer>
  )
}
