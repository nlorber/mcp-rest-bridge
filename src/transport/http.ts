import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { hostHeaderValidation } from "@modelcontextprotocol/sdk/server/middleware/hostHeaderValidation.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Logger } from "../logger.js";
import { createRequestLogger } from "./request-logger.js";
import { createRateLimiter } from "./rate-limiter.js";

/** Default maximum number of concurrent sessions. */
const DEFAULT_MAX_SESSIONS = 1000;

/** Default idle timeout: evict sessions inactive for more than 30 minutes. */
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

/** Default Host header hostnames accepted on /mcp: loopback only. */
const DEFAULT_ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"];

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
  /**
   * Hostnames (without port; IPv6 in brackets) accepted in the Host header on /mcp.
   * Guards against DNS rebinding. Defaults to loopback only.
   */
  allowedHosts?: string[];
  /**
   * Origins accepted on /mcp when a request carries an Origin header (browser clients).
   * Requests without an Origin header are unaffected. Defaults to none.
   */
  allowedOrigins?: string[];
}

/**
 * Evict and close sessions idle longer than idleTimeoutMs. Extracted from the
 * interval callback so the sweep can be unit-tested without the 60s timer.
 */
export function sweepIdleSessions<
  T extends { lastActivity: number; transport: { close(): Promise<void> } },
>(sessions: Map<string, T>, now: number, idleTimeoutMs: number, logger: Logger): void {
  for (const [id, entry] of sessions) {
    if (now - entry.lastActivity > idleTimeoutMs) {
      sessions.delete(id);
      void entry.transport.close();
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
  const allowedHosts = options.allowedHosts ?? DEFAULT_ALLOWED_HOSTS;
  const allowedOrigins = options.allowedOrigins ?? [];

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

  // DNS rebinding protection: a rebound browser page reaches /mcp with an attacker
  // hostname in Host and the attacker's page in Origin, so both are checked.
  app.use("/mcp", hostHeaderValidation(allowedHosts));
  app.use("/mcp", (req, res, next) => {
    const origin = req.headers.origin;
    if (origin !== undefined && !allowedOrigins.includes(origin)) {
      res.status(403).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: `Invalid Origin: ${origin}` },
        id: null,
      });
      return;
    }
    next();
  });

  app.use("/mcp", createRateLimiter(rateLimit));

  const sessions = new Map<string, SessionEntry>();

  // Periodic sweep: evict sessions that have been idle longer than idleTimeoutMs
  const sweepTimer = setInterval(() => {
    sweepIdleSessions(sessions, Date.now(), idleTimeoutMs, logger);
  }, SWEEP_INTERVAL_MS);
  sweepTimer.unref();

  app.all("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId) {
      const entry = sessions.get(sessionId);
      if (!entry) {
        // Unknown or evicted session: per the MCP spec, 404 tells the client to re-initialize
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        });
        return;
      }
      entry.lastActivity = Date.now();
      await entry.transport.handleRequest(req, res, req.body);
      return;
    }

    // Only an initialize request may open a session, so requests that would be
    // rejected anyway never allocate a Server and transport.
    if (req.method !== "POST" || !isInitializeRequest(req.body)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: no valid session ID provided" },
        id: null,
      });
      return;
    }

    // Enforce session cap before creating a new session
    if (sessions.size >= maxSessions) {
      res.status(503).json({ error: "Server is at session capacity — try again later" });
      logger.warn("session cap reached, rejecting new session", { maxSessions });
      return;
    }

    // Each session gets its own Server instance because Server.connect() supports
    // only one transport at a time. The session enters the map only once the SDK
    // has accepted the initialize request.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (newSessionId) => {
        sessions.set(newSessionId, { transport, lastActivity: Date.now() });
        logger.debug("new session created", { sessionId: newSessionId });
      },
    });

    // Set before connect(): Server.connect() chains its own close handler onto this one
    transport.onclose = () => {
      if (transport.sessionId) sessions.delete(transport.sessionId);
      logger.debug("session closed", { sessionId: transport.sessionId });
    };

    await serverFactory().connect(transport);
    await transport.handleRequest(req, res, req.body);
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
