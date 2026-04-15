/**
 * In-memory sliding-window rate limiter.
 *
 * Serverless caveat: state lives per-instance and resets on cold start.
 * This provides burst-abuse protection within a warm instance — not a
 * globally distributed rate limiter. For this project's scale, it's enough.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });
 *   if (!limiter.check(userId)) return jsonResponse({ error: 'Too many requests' }, 429);
 */

interface RateLimiterOptions {
  /** Time window in milliseconds */
  windowMs: number;
  /** Max requests per window per key */
  max: number;
}

interface Entry {
  timestamps: number[];
}

export function createRateLimiter({ windowMs, max }: RateLimiterOptions) {
  const store = new Map<string, Entry>();

  // Periodic cleanup to prevent memory leaks (every 60s)
  let lastCleanup = Date.now();
  const CLEANUP_INTERVAL = 60_000;

  function cleanup(now: number) {
    if (now - lastCleanup < CLEANUP_INTERVAL) return;
    lastCleanup = now;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);
      if (entry.timestamps.length === 0) store.delete(key);
    }
  }

  return {
    /**
     * Returns true if the request is allowed, false if rate-limited.
     */
    check(key: string): boolean {
      const now = Date.now();
      cleanup(now);

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Remove timestamps outside the window
      entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

      if (entry.timestamps.length >= max) {
        return false; // rate limited
      }

      entry.timestamps.push(now);
      return true; // allowed
    },
  };
}
