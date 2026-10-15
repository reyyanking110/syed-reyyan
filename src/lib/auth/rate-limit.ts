import "server-only";
import { headers } from "next/headers";

/**
 * Minimal in-memory sliding-window rate limiter used for authentication endpoints.
 * Suitable for a single instance; swap for Redis/Upstash when running multiple replicas.
 */
type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as typeof globalThis & { __skillorbitRateLimit?: Map<string, Bucket> };
const buckets = globalForLimiter.__skillorbitRateLimit ?? new Map<string, Bucket>();
globalForLimiter.__skillorbitRateLimit = buckets;

export async function clientIdentifier() {
  try {
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    return (forwarded ? forwarded.split(",")[0] : headerStore.get("x-real-ip"))?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (bucket.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSeconds: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

// Periodically prune stale buckets so the map does not grow unbounded.
if (buckets.size === 0 && typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  }, 60_000);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
