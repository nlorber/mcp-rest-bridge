import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import type { Logger } from "../../src/logger.js";

describe("Request Logger Middleware", () => {
  let logger: Logger;

  beforeEach(() => {
    logger = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;
  });

  it("logs method, path, status, and duration on response finish", async () => {
    const { createRequestLogger } = await import("../../src/transport/request-logger.js");
    const middleware = createRequestLogger(logger);

    const req = { method: "POST", path: "/mcp" } as Request;
    const res = {
      statusCode: 200,
      on: vi.fn(),
    } as unknown as Response;
    const next: NextFunction = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();

    // Simulate the "finish" event
    const onCall = (res.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (args: unknown[]) => args[0] === "finish",
    );
    expect(onCall).toBeDefined();

    // Call the finish handler
    onCall![1]();

    expect(logger.info).toHaveBeenCalledWith(
      "request completed",
      expect.objectContaining({
        method: "POST",
        path: "/mcp",
        status: 200,
      }),
    );

    // Duration should be a number
    const context = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(typeof context.durationMs).toBe("number");
  });
});
