'use client';

import { useEffect } from 'react';
import { initSentry } from '@/lib/sentry';

export default function SentryMount() {
  useEffect(() => {
    initSentry();
  }, []);
  return null;
}
