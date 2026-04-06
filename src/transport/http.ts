import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Logger } from "../logger.js";
import { createRequestLogger } from "./request-logger.js";
import { createRateLimiter } from "./rate-limiter.js";

/**
 * Start the MCP server with HTTP transport (for web clients, multi-session).
 * Manages sessions via mcp-session-id header.
 *
 * Accepts a factory function rather than a Server instance: the MCP SDK's Server
 * class supports only one active transport at a time, so each session gets its
 * own Server instance created by the factory.
 *
 * Returns the underlying http.Server for lifecycle management (e.g. graceful shutdown in tests).
 */
export function startHttpTransport(
  serverFactory: () => Server,
  port: number,
  logger: Logger,
  rateLimit: { maxTokens: number; refillRatePerSec: number },
): Promise<HttpServer> {
  const app = express();
  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.use("/mcp", createRateLimiter(rateLimit));

  const transports = new Map<string, StreamableHTTPServerTransport>();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Reuse existing session
    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
      return;
    }

    // Create new session — each session gets its own Server instance because
    // Server.connect() supports only one transport at a time.
    // Pre-generate the session ID so it can be stored in the map immediately
    // (transport.sessionId is null until handleRequest is called, which may
    // hold the connection open for SSE streams).
    const newSessionId = randomUUID();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => newSessionId,
    });

    await serverFactory().connect(transport);
    transports.set(newSessionId, transport);

    transport.onclose = () => {
      transports.delete(newSessionId);
      logger.debug("session closed", { sessionId: newSessionId });
    };

    await transport.handleRequest(req, res, req.body);
    logger.debug("new session created", { sessionId: newSessionId });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sessions: transports.size });
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(port, () => {
      logger.info("server started", { transport: "http", port });
      resolve(httpServer);
    });
  });
}
