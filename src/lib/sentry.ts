import * as Sentry from '@sentry/browser';

let initialized = false;

export function initSentry(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
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
