import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Logger } from "../logger.js";
import { createRequestLogger } from "./request-logger.js";
import { createRateLimiter } from "./rate-limiter.js";

/** Default maximum number of concurrent sessions. */
const DEFAULT_MAX_SESSIONS = 1000;

/** Default idle timeout: evict sessions inactive for more than 30 minutes. */
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** How often the idle-eviction sweep runs. */
const SWEEP_INTERVAL_MS = 60_000;

interface SessionEntry {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

export interface HttpTransportOptions {
  /** Maximum concurrent sessions (default: 1000). */
  maxSessions?: number;
  /** Milliseconds before an idle session is evicted (default: 30 min). */
  idleTimeoutMs?: number;
  /**
   * Express `trust proxy` setting. Set to `true` (or a specific value) when
   * running behind a reverse proxy so that `req.ip` reflects the client IP
   * rather than the proxy IP. Without this, per-IP rate limiting is ineffective.
   *
   * When `undefined` (not set), a warning is logged at startup. Set
   * `requireTrustProxy: true` to fail-closed instead (startup error).
   */
  trustProxy?: boolean | string | number;
  /**
   * When `true`, the server refuses to start if `trustProxy` is not explicitly
   * configured. Defaults to `false` (warn-only).
   */
  requireTrustProxy?: boolean;
}

/**
 * Evict sessions idle longer than idleTimeoutMs. Extracted from the interval
 * callback so the sweep can be unit-tested without the 60s timer.
 */
export function sweepIdleSessions<T extends { lastActivity: number }>(
  sessions: Map<string, T>,
  now: number,
  idleTimeoutMs: number,
  logger: Logger,
): void {
  for (const [id, entry] of sessions) {
    if (now - entry.lastActivity > idleTimeoutMs) {
      sessions.delete(id);
      logger.debug("idle session evicted", { sessionId: id });
    }
  }
}

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
  options: HttpTransportOptions = {},
): Promise<HttpServer> {
  const maxSessions = options.maxSessions ?? DEFAULT_MAX_SESSIONS;
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;

  // Trust proxy check: warn or fail-closed if not configured
  if (options.trustProxy === undefined) {
    const msg =
      'HTTP transport: "trust proxy" is not set. ' +
      "req.ip will reflect the proxy/load-balancer IP, defeating per-IP rate limiting. " +
      "Set options.trustProxy or enable options.requireTrustProxy to enforce this.";
    if (options.requireTrustProxy) {
      throw new Error(msg);
    }
    logger.warn(msg);
  }

  const app = express();
  if (options.trustProxy !== undefined) {
    app.set("trust proxy", options.trustProxy);
  }
  app.use(express.json());
  app.use(createRequestLogger(logger));

  app.use("/mcp", createRateLimiter(rateLimit));

  const sessions = new Map<string, SessionEntry>();

  // Periodic sweep: evict sessions that have been idle longer than idleTimeoutMs
  const sweepTimer = setInterval(() => {
    sweepIdleSessions(sessions, Date.now(), idleTimeoutMs, logger);
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Reuse existing session and refresh its activity timestamp
    if (sessionId && sessions.has(sessionId)) {
      const entry = sessions.get(sessionId)!;
      entry.lastActivity = Date.now();
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    // Enforce session cap before creating a new session
    if (sessions.size >= maxSessions) {
      res.status(503).json({ error: "Server is at session capacity — try again later" });
      logger.warn("session cap reached, rejecting new session", { maxSessions });
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
    sessions.set(newSessionId, { transport, lastActivity: Date.now() });

    transport.onclose = () => {
      sessions.delete(newSessionId);
      logger.debug("session closed", { sessionId: newSessionId });
    };

    await transport.handleRequest(req, res, req.body);
    logger.debug("new session created", { sessionId: newSessionId });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", sessions: sessions.size });
  });

  return new Promise((resolve) => {
    const httpServer = app.listen(port, () => {
      logger.info("server started", { transport: "http", port });
      resolve(httpServer);
    });
  });
}
