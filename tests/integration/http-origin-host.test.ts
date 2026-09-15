import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { request, type Server as HttpServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { startHttpTransport } from "../../src/transport/http.js";
import { Logger } from "../../src/logger.js";

const DEFAULT_PORT = 14590;
const CUSTOM_PORT = 14591;
const RATE_LIMIT = { maxTokens: 100, refillRatePerSec: 10 };

function serverFactory(): Server {
  return new Server({ name: "test-origin-host", version: "0.0.1" }, { capabilities: {} });
}

/**
 * POST /mcp with explicit Host/Origin headers (fetch() does not let callers set them).
 * The body is a non-initialize request, so a request that passes both checks reaches
 * session handling and gets 400; a rejected one gets 403.
 */
function post(port: number, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/mcp",
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      },
      (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      },
    );
    req.on("error", reject);
    req.end(JSON.stringify({ jsonrpc: "2.0", method: "tools/list", id: 1 }));
  });
}

describe("HTTP transport Host and Origin validation", () => {
  const servers: HttpServer[] = [];

  beforeAll(async () => {
    const logger = new Logger("error");
    servers.push(
      await startHttpTransport(serverFactory, DEFAULT_PORT, logger, RATE_LIMIT, { trustProxy: false }),
      await startHttpTransport(serverFactory, CUSTOM_PORT, logger, RATE_LIMIT, {
        trustProxy: false,
        allowedHosts: ["mcp-server"],
        allowedOrigins: ["https://app.example"],
      }),
    );
  });

  afterAll(async () => {
    await Promise.all(servers.map((s) => new Promise<void>((resolve) => s.close(() => resolve()))));
  });

  it("accepts loopback hosts by default", async () => {
    expect(await post(DEFAULT_PORT, { Host: `localhost:${DEFAULT_PORT}` })).toBe(400);
    expect(await post(DEFAULT_PORT, { Host: `127.0.0.1:${DEFAULT_PORT}` })).toBe(400);
  });

  it("rejects a non-loopback Host header by default (DNS rebinding)", async () => {
    expect(await post(DEFAULT_PORT, { Host: `evil.example:${DEFAULT_PORT}` })).toBe(403);
  });

  it("rejects any Origin by default and ignores requests without one", async () => {
    expect(
      await post(DEFAULT_PORT, { Host: `localhost:${DEFAULT_PORT}`, Origin: "http://evil.example" }),
    ).toBe(403);
    expect(await post(DEFAULT_PORT, { Host: `localhost:${DEFAULT_PORT}` })).toBe(400);
  });

  it("uses configured host and origin lists in place of the defaults", async () => {
    expect(await post(CUSTOM_PORT, { Host: "mcp-server:3456" })).toBe(400);
    expect(await post(CUSTOM_PORT, { Host: "mcp-server:3456", Origin: "https://app.example" })).toBe(400);
    expect(await post(CUSTOM_PORT, { Host: `localhost:${CUSTOM_PORT}` })).toBe(403);
    expect(await post(CUSTOM_PORT, { Host: "mcp-server:3456", Origin: "http://evil.example" })).toBe(403);
  });

  it("leaves /health reachable under any Host for load-balancer probes", async () => {
    const status = await new Promise<number>((resolve, reject) => {
      request({ host: "127.0.0.1", port: DEFAULT_PORT, path: "/health", headers: { Host: "lb.internal" } }, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      })
        .on("error", reject)
        .end();
    });
    expect(status).toBe(200);
  });
});
