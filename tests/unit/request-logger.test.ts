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

  function makeReq(overrides: Partial<Request> = {}): Request {
    return { method: "GET", path: "/mcp", ...overrides } as Request;
  }

  function makeRes(statusCode = 200): Response {
    return { statusCode, on: vi.fn() } as unknown as Response;
  }

  function triggerFinish(res: Response): void {
    const onCall = (res.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (args: unknown[]) => args[0] === "finish",
    );
    onCall![1]();
  }

  it("logs method, path, status, and duration on response finish", async () => {
    const { createRequestLogger } = await import("../../src/transport/request-logger.js");
    const middleware = createRequestLogger(logger);

    const req = makeReq({ method: "POST" });
    const res = makeRes(200);
    const next: NextFunction = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    triggerFinish(res);

    expect(logger.info).toHaveBeenCalledWith(
      "request completed",
      expect.objectContaining({
        method: "POST",
        path: "/mcp",
        status: 200,
      }),
    );

    const context = (logger.info as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(typeof context.durationMs).toBe("number");
  });

  it("logs error status codes", async () => {
    const { createRequestLogger } = await import("../../src/transport/request-logger.js");
    const middleware = createRequestLogger(logger);

    const req = makeReq();
    const res = makeRes(500);
    const next: NextFunction = vi.fn();

    middleware(req, res, next);
    triggerFinish(res);

    expect(logger.info).toHaveBeenCalledWith(
      "request completed",
      expect.objectContaining({ status: 500 }),
    );
  });

  it("logs different HTTP methods correctly", async () => {
    const { createRequestLogger } = await import("../../src/transport/request-logger.js");
    const middleware = createRequestLogger(logger);

    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      const req = makeReq({ method });
      const res = makeRes(200);
      middleware(req, res, vi.fn());
      triggerFinish(res);
    }

    const methods = (logger.info as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: unknown[]) => (call[1] as { method: string }).method,
    );
    expect(methods).toEqual(["GET", "PUT", "DELETE", "PATCH"]);
  });

  it("logs the correct path for different endpoints", async () => {
    const { createRequestLogger } = await import("../../src/transport/request-logger.js");
    const middleware = createRequestLogger(logger);

    const req = makeReq({ path: "/health" });
    const res = makeRes(200);

    middleware(req, res, vi.fn());
    triggerFinish(res);

    expect(logger.info).toHaveBeenCalledWith(
      "request completed",
      expect.objectContaining({ path: "/health" }),
    );
  });
});
