import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { Server as HttpServer } from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { startHttpTransport } from "../../src/transport/http.js";
import { Logger } from "../../src/logger.js";

const TEST_PORT = 14567;
const BASE_URL = `http://localhost:${TEST_PORT}`;

/** Minimal server that registers the handlers implied by its declared capabilities. */
function serverFactory(): Server {
  const server = new Server(
    { name: "test-http-server", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, () => Promise.resolve({ tools: [] }));
  return server;
}

interface ConnectedClient {
  client: Client;
  transport: StreamableHTTPClientTransport;
}

async function makeClient(): Promise<ConnectedClient> {
  const client = new Client({ name: "test-client", version: "0.0.1" });
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE_URL}/mcp`));
  await client.connect(transport);
  return { client, transport };
}

async function healthSessions(): Promise<number> {
  const res = await fetch(`${BASE_URL}/health`);
  const body = (await res.json()) as { sessions: number };
  return body.sessions;
}

describe("HTTP Transport", () => {
  let httpServer: HttpServer;
  const openClients: ConnectedClient[] = [];

  beforeAll(async () => {
    httpServer = await startHttpTransport(serverFactory, TEST_PORT, new Logger("error"), {
      maxTokens: 100,
      refillRatePerSec: 10,
    });
  });

  afterAll(
    () =>
      new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      }),
  );

  afterEach(async () => {
    // terminateSession() sends DELETE to the server, triggering onclose and
    // removing the session from the map before the next test starts.
    await Promise.allSettled(openClients.map(({ transport }) => transport.terminateSession()));
    await Promise.allSettled(openClients.map(({ client }) => client.close()));
    openClients.length = 0;
  });

  it("health endpoint returns ok status and zero sessions on startup", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { status: string; sessions: number };
    expect(body.status).toBe("ok");
    expect(body.sessions).toBe(0);
  });

  it("connecting an MCP client increments the session count", async () => {
    const conn = await makeClient();
    openClients.push(conn);

    expect(await healthSessions()).toBe(1);
  });

  it("two simultaneous clients produce two sessions", async () => {
    const [c1, c2] = await Promise.all([makeClient(), makeClient()]);
    openClients.push(c1, c2);

    expect(await healthSessions()).toBe(2);
  });

  it("session count returns to zero after client terminates", async () => {
    const conn = await makeClient();
    expect(await healthSessions()).toBe(1);

    await conn.transport.terminateSession();
    await conn.client.close();

    expect(await healthSessions()).toBe(0);
  });

  it("connected client can list tools", async () => {
    const conn = await makeClient();
    openClients.push(conn);

    const result = await conn.client.listTools();
    expect(Array.isArray(result.tools)).toBe(true);
    expect(result.tools).toHaveLength(0);
  });

  it("rate limiter returns 429 when token bucket is exhausted", async () => {
    // The server is configured with maxTokens: 100, refillRatePerSec: 10.
    // Send enough raw POST requests to /mcp to exhaust the bucket, then
    // verify we get a 429 response. We use raw fetch instead of the MCP
    // client to avoid session/protocol overhead and to inspect status codes directly.
    const results: number[] = [];
    for (let i = 0; i < 105; i++) {
      const res = await fetch(`${BASE_URL}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: i }),
      });
      results.push(res.status);
    }

    expect(results).toContain(429);

    // Verify the 429 response includes Retry-After header
    const lastRes = await fetch(`${BASE_URL}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "initialize", id: 999 }),
    });
    if (lastRes.status === 429) {
      expect(lastRes.headers.has("retry-after")).toBe(true);
    }
  });
});
