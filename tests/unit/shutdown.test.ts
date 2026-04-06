import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Logger } from "../../src/logger.js";

function makeMockLogger(): Logger {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  } as unknown as Logger;
}

describe("Graceful Shutdown", () => {
  const originalListeners: Record<string, NodeJS.SignalsListener[]> = {};

  beforeEach(() => {
    originalListeners["SIGTERM"] = process.listeners("SIGTERM") as NodeJS.SignalsListener[];
    originalListeners["SIGINT"] = process.listeners("SIGINT") as NodeJS.SignalsListener[];
  });

  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
    for (const listener of originalListeners["SIGTERM"]) {
      process.on("SIGTERM", listener);
    }
    for (const listener of originalListeners["SIGINT"]) {
      process.on("SIGINT", listener);
    }
  });

  it("registerShutdown installs SIGTERM and SIGINT handlers", async () => {
    const { registerShutdown } = await import("../../src/shutdown.js");
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const logger = makeMockLogger();

    registerShutdown(cleanup, logger);

    expect(process.listenerCount("SIGTERM")).toBeGreaterThanOrEqual(1);
    expect(process.listenerCount("SIGINT")).toBeGreaterThanOrEqual(1);
  });

  it("calls the cleanup function on signal", async () => {
    const { registerShutdown } = await import("../../src/shutdown.js");
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const logger = makeMockLogger();
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerShutdown(cleanup, logger);
    process.emit("SIGTERM", "SIGTERM");

    // Allow microtasks to flush
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup).toHaveBeenCalledOnce();
    expect(mockExit).toHaveBeenCalledWith(0);

    mockExit.mockRestore();
  });

  it("calls cleanup only once when signal is emitted twice", async () => {
    const { registerShutdown } = await import("../../src/shutdown.js");
    const cleanup = vi.fn().mockResolvedValue(undefined);
    const logger = makeMockLogger();
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerShutdown(cleanup, logger);
    process.emit("SIGTERM", "SIGTERM");
    process.emit("SIGTERM", "SIGTERM");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup).toHaveBeenCalledOnce();

    mockExit.mockRestore();
  });

  it("exits with code 1 when cleanup throws", async () => {
    const { registerShutdown } = await import("../../src/shutdown.js");
    const cleanup = vi.fn().mockRejectedValue(new Error("cleanup failed"));
    const logger = makeMockLogger();
    const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

    registerShutdown(cleanup, logger);
    process.emit("SIGTERM", "SIGTERM");

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(cleanup).toHaveBeenCalledOnce();
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });
});
