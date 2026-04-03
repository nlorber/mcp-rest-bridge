import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TtlCache } from "../../src/utils/cache.js";

describe("TtlCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls the fetcher on first access", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    const cache = new TtlCache(fetcher, 5000);

    const result = await cache.get();
    expect(result).toBe("data");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("returns cached value before TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValue("data");
    const cache = new TtlCache(fetcher, 5000);

    await cache.get();
    vi.advanceTimersByTime(4999);
    const result = await cache.get();

    expect(result).toBe("data");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("re-fetches after TTL expires", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    const cache = new TtlCache(fetcher, 5000);

    expect(await cache.get()).toBe("old");

    vi.advanceTimersByTime(5001);
    expect(await cache.get()).toBe("new");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent fetches", async () => {
    let resolvePromise: (v: string) => void;
    const fetcher = vi.fn().mockReturnValue(
      new Promise<string>((r) => {
        resolvePromise = r;
      }),
    );
    const cache = new TtlCache(fetcher, 5000);

    const p1 = cache.get();
    const p2 = cache.get();
    const p3 = cache.get();

    resolvePromise!("shared");
    const results = await Promise.all([p1, p2, p3]);

    expect(results).toEqual(["shared", "shared", "shared"]);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("invalidate() forces re-fetch on next access", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    const cache = new TtlCache(fetcher, 60_000);

    expect(await cache.get()).toBe("v1");

    cache.invalidate();
    expect(await cache.get()).toBe("v2");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("propagates fetcher errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network error"));
    const cache = new TtlCache(fetcher, 5000);

    await expect(cache.get()).rejects.toThrow("network error");
  });

  it("retries after a failed fetch", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValueOnce("recovered");
    const cache = new TtlCache(fetcher, 5000);

    await expect(cache.get()).rejects.toThrow("fail");
    expect(await cache.get()).toBe("recovered");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
