import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { Logger } from "../logger.js";

/**
 * Express middleware that logs method, path, status, and duration for each request.
 */
export function createRequestLogger(logger: Logger): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = performance.now();

    res.on("finish", () => {
      logger.info("request completed", {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
      });
    });

    next();
  };
}
