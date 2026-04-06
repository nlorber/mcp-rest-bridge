import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    const { createRateLimiter } = await import("../../src/transport/rate-limiter.js");
    const middleware = createRateLimiter({ maxTokens: 5, refillRatePerSec: 1 });

    const req = { ip: "127.0.0.1" } as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects requests over the limit with 429", async () => {
    const { createRateLimiter } = await import("../../src/transport/rate-limiter.js");
    const middleware = createRateLimiter({ maxTokens: 2, refillRatePerSec: 0 });

    const req = { ip: "127.0.0.1" } as Request;
    const next: NextFunction = vi.fn();

    const makeRes = () =>
      ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      }) as unknown as Response;

    // Consume both tokens
    middleware(req, makeRes(), next);
    middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    // Third request should be rejected
    const res3 = makeRes();
    middleware(req, res3, vi.fn());
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(res3.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Rate limit") }),
    );
  });

  it("refills tokens over time", async () => {
    const { createRateLimiter } = await import("../../src/transport/rate-limiter.js");
    const middleware = createRateLimiter({ maxTokens: 1, refillRatePerSec: 1 });

    const req = { ip: "127.0.0.1" } as Request;
    const next: NextFunction = vi.fn();

    const makeRes = () =>
      ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      }) as unknown as Response;

    // Use the single token
    middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    // Should be blocked now
    const res2 = makeRes();
    middleware(req, res2, vi.fn());
    expect(res2.status).toHaveBeenCalledWith(429);

    // Advance time by 1 second — should refill 1 token
    vi.advanceTimersByTime(1000);

    middleware(req, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });

  it("tracks rate limits per IP", async () => {
    const { createRateLimiter } = await import("../../src/transport/rate-limiter.js");
    const middleware = createRateLimiter({ maxTokens: 1, refillRatePerSec: 0 });

    const next: NextFunction = vi.fn();

    const makeRes = () =>
      ({
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn(),
      }) as unknown as Response;

    // IP 1 uses its token
    middleware({ ip: "1.1.1.1" } as Request, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(1);

    // IP 2 should still have its own token
    middleware({ ip: "2.2.2.2" } as Request, makeRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
