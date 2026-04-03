/**
 * Lemon Squeezy API 헬퍼
 *
 * 환경변수:
 *   LS_API_KEY          — API 키
 *   LS_STORE_ID         — 스토어 ID
 *   LS_WEBHOOK_SECRET   — Webhook 서명 검증용
 *   LS_VARIANT_FT_SINGLE   — 단건 (3,900원) variant ID
 *   LS_VARIANT_FT_POINTS   — 포인트 (9,900원/5회) variant ID
 *   LS_VARIANT_FT_SUB_MONTHLY — 구독 월 (9,900원) variant ID
 *   LS_VARIANT_FT_SUB_YEARLY  — 구독 연 (79,000원) variant ID
 */

const LS_API_BASE = 'https://api.lemonsqueezy.com/v1';

function getApiKey(): string {
  const key = process.env.LS_API_KEY;
  if (!key) throw new Error('LS_API_KEY is not set');
  return key;
}

function getStoreId(): string {
  const id = process.env.LS_STORE_ID;
  if (!id) throw new Error('LS_STORE_ID is not set');
  return id;
}

// ─── 타입 ─────────────────────────────────────────────────────────────

export type FtPlanType = 'single' | 'points' | 'monthly' | 'yearly';

interface CheckoutOptions {
  variantId: string;
  userId: string;
  userEmail: string;
  customData?: Record<string, string>;
}

interface CheckoutResponse {
  url: string;
}

// ─── Variant 매핑 ─────────────────────────────────────────────────────

const VARIANT_ENV_MAP: Record<FtPlanType, string> = {
  single: 'LS_VARIANT_FT_SINGLE',
  points: 'LS_VARIANT_FT_POINTS',
  monthly: 'LS_VARIANT_FT_SUB_MONTHLY',
  yearly: 'LS_VARIANT_FT_SUB_YEARLY',
};

export function getVariantId(plan: FtPlanType): string {
  const envKey = VARIANT_ENV_MAP[plan];
  const id = process.env[envKey];
  if (!id) throw new Error(`${envKey} is not set`);
  return id;
}

// ─── Checkout 생성 ────────────────────────────────────────────────────

export async function createCheckout(options: CheckoutOptions): Promise<CheckoutResponse> {
  const res = await fetch(`${LS_API_BASE}/checkouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
    },
    body: JSON.stringify({
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: options.userEmail,
            custom: {
              user_id: options.userId,
              ...options.customData,
            },
          },
          product_options: {
            redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fortunetab.com'}/session/result`,
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: getStoreId() },
          },
          variant: {
            data: { type: 'variants', id: options.variantId },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lemon Squeezy checkout failed: ${err}`);
  }

  const json = await res.json();
  return { url: json.data.attributes.url };
}

// ─── Webhook 서명 검증 ────────────────────────────────────────────────

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
): Promise<boolean> {
  const secret = process.env.LS_WEBHOOK_SECRET;
  if (!secret) throw new Error('LS_WEBHOOK_SECRET is not set');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );

  // 서명을 hex → Uint8Array로 변환
  const sigBytes = new Uint8Array(
    (signature.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)),
  );

  // timing-safe 비교: verify()는 내부적으로 상수 시간 비교 수행
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(rawBody));
}

// ─── Webhook 이벤트 타입 ──────────────────────────────────────────────

export interface LsWebhookEvent {
  meta: {
    event_name: string;
    custom_data: {
      user_id: string;
      [key: string]: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      status: string;
      variant_id: number;
      customer_id: number;
      first_subscription_item?: {
        subscription_id: number;
      };
      renews_at?: string;
      ends_at?: string | null;
      [key: string]: unknown;
    };
  };
}
