declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js' | 'set',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void
    dataLayer: unknown[]
  }
}

function gtag(...args: Parameters<Window['gtag']>) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

/**
 * Track email signup form submission.
 * Called after successful client-side validation, before backend submission.
 */
export function trackEmailSubmit(params?: {
  job_category?: string
  has_reason?: boolean
}) {
  gtag('event', 'email_submit', {
    event_category: 'engagement',
    event_label: 'signup_form',
    ...params,
  })
}

/**
 * Track which pricing plan's CTA button was clicked (Fake Door).
 * @param planName - 'plan_a_기본플래너' or 'plan_b_플래너_리포트'
 * @param planPrice - numeric price in KRW
 */
export function trackPriceButtonClick(planName: string, planPrice: number) {
  gtag('event', 'price_button_click', {
    event_category: 'fake_door',
    plan_name: planName,
    plan_price: planPrice,
    currency: 'KRW',
  })
}

/**
 * Track scroll depth milestones.
 * @param depth - 50 or 90 (percent)
 */
export function trackScrollDepth(depth: 50 | 90) {
  gtag('event', `page_scroll_${depth}`, {
    event_category: 'scroll',
    event_label: `${depth}_percent`,
    value: depth,
  })
}

export {}
