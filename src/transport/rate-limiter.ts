import type { Request, Response, NextFunction, RequestHandler } from "express";

interface RateLimiterConfig {
  /** Maximum tokens per IP bucket */
  maxTokens: number;
  /** Tokens added per second */
  refillRatePerSec: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const SWEEP_INTERVAL_MS = 60_000;

/**
 * In-memory per-IP token bucket rate limiter.
 */
export function createRateLimiter(config: RateLimiterConfig): RequestHandler {
  const buckets = new Map<string, Bucket>();

  const sweepTimer = setInterval(() => {
    const now = performance.now();
    for (const [ip, bucket] of buckets) {
      const elapsed = (now - bucket.lastRefill) / 1000;
      const refilled = bucket.tokens + elapsed * config.refillRatePerSec;
      if (refilled >= config.maxTokens) {
        buckets.delete(ip);
      }
    }
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? "unknown";
    const now = performance.now();

    let bucket = buckets.get(ip);
    if (!bucket) {
      bucket = { tokens: config.maxTokens, lastRefill: now };
      buckets.set(ip, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRatePerSec);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      if (config.refillRatePerSec > 0) {
        const retryAfterSec = Math.ceil((1 - bucket.tokens) / config.refillRatePerSec);
        res.setHeader("Retry-After", String(retryAfterSec));
      }
      res.status(429).json({ error: "Rate limit exceeded — try again later" });
      return;
    }

    bucket.tokens -= 1;
    next();
  };
}
