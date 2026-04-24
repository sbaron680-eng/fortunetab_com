import * as Sentry from '@sentry/browser';

// DSN is a public token (NEXT_PUBLIC_*): safe to ship in the client bundle.
// Hardcoded because Cloudflare Pages dashboard env vars aren't injected into
// the Next.js static-export build's inline of process.env.NEXT_PUBLIC_*.
const FALLBACK_DSN = 'https://26640e7b47028d1fb0aa7dd4cfe7795e@o4511274302832640.ingest.us.sentry.io/4511274315481088';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || FALLBACK_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? 'production',
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend(event) {
      const url = event.request?.url ?? '';
      if (/\/(admin|auth\/callback)/.test(url)) {
        if (event.request) delete event.request.cookies;
      }
      return event;
    },
  });
  initialized = true;
}

export function captureException(err: unknown, extra?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.captureException(err, extra ? { extra } : undefined);
}
