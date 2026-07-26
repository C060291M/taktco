// Simple in-memory sliding-window rate limiter for auth-sensitive routes
// (login, signup, public payment/approval endpoints - anywhere an
// unauthenticated caller can hit the app repeatedly).
//
// HONEST LIMITATION: this is per-process memory, not a shared store. It
// works correctly on a single server instance (which is what a Railway
// deployment is by default) but resets on restart and doesn't coordinate
// across multiple instances. If TAKTCO ever runs multiple instances behind
// a load balancer, swap this for a Redis-backed limiter (Upstash's
// @upstash/ratelimit is the standard choice) - the call site below
// (checkRateLimit) is the only place that would need to change.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count++;
  return { allowed: true, retryAfterMs: 0 };
}

// Periodic cleanup so the map doesn't grow unbounded on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 60_000);

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
