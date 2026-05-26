import { describe, it, expect } from "vitest";
import { withTimeout, TimeoutError, getToolTimeout } from "../../src/utils/timeout.js";

describe("withTimeout", () => {
  it("should resolve when promise completes within timeout", async () => {
    const result = await withTimeout(() => Promise.resolve("ok"), 1000, "test");
    expect(result).toBe("ok");
  });

  it("should reject with TimeoutError when promise exceeds timeout", async () => {
    const slow = (_signal: AbortSignal) => new Promise((resolve) => setTimeout(resolve, 5000));
    await expect(withTimeout(slow, 50, "slow-op")).rejects.toThrow(TimeoutError);
  });

  it("should include operation name in TimeoutError message", async () => {
    const slow = (_signal: AbortSignal) => new Promise((resolve) => setTimeout(resolve, 5000));
    await expect(withTimeout(slow, 50, "my-operation")).rejects.toThrow("my-operation");
  });

  it("should propagate original errors", async () => {
    const failing = () => Promise.reject(new Error("original"));
    await expect(withTimeout(failing, 1000, "test")).rejects.toThrow("original");
  });

  it("should abort the signal when timeout fires", async () => {
    let capturedSignal: AbortSignal | undefined;
    // Factory captures the signal but keeps the promise pending so that
    // only the timeout side of the race resolves first.
    const slow = (signal: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<never>(() => {
        // intentionally never resolves or rejects — timeout wins
      });
    };

    await expect(withTimeout(slow, 50, "abort-test")).rejects.toThrow(TimeoutError);
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe("getToolTimeout", () => {
  it("should return default when tool has no override", () => {
    expect(getToolTimeout("unknown_tool", 60000)).toBe(60000);
  });
});
