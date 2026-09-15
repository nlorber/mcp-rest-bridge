import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/config.js";
import { Logger } from "../../src/logger.js";
import { clearSchemes } from "../../src/protocol/resources/uri-router.js";
import { createMcpServer } from "../../src/server.js";
import { startStdioTransport } from "../../src/transport/stdio.js";

// createMcpServer registers URI schemes in a module-level registry (tools get their own
// per server); reset the schemes around each test so repeated construction stays isolated.
beforeEach(() => {
  clearSchemes();
  // loadConfig requires upstream credentials; these tests never call the API
  vi.stubEnv("API_USERNAME", "test-user");
  vi.stubEnv("API_PASSWORD", "test-pass");
});
afterEach(() => {
  clearSchemes();
  vi.unstubAllEnvs();
});

describe("createMcpServer", () => {
  it("wires tools, prompts and resources reachable from a connected client", async () => {
    const server = createMcpServer(loadConfig(), new Logger("error"));
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);

    const { prompts } = await client.listPrompts();
    expect(Array.isArray(prompts)).toBe(true);

    const { resources } = await client.listResources();
    expect(Array.isArray(resources)).toBe(true);

    await client.close();
  });

  it("gives each server its own tools, so one server's registry cannot serve another", async () => {
    const config = loadConfig();
    const first = createMcpServer(config, new Logger("error"));
    const second = createMcpServer(config, new Logger("error"));

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([client.connect(clientTransport), first.connect(serverTransport)]);

    // The second server exists and registered its own tools; the first still serves its own
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(7);
    expect(second).not.toBe(first);

    await client.close();
  });
});

describe("startStdioTransport", () => {
  it("connects the server over a stdio transport", async () => {
    const server = createMcpServer(loadConfig(), new Logger("error"));
    const connectSpy = vi.spyOn(server, "connect").mockResolvedValue(undefined);

    await startStdioTransport(server, new Logger("error"));

    expect(connectSpy).toHaveBeenCalledOnce();
  });
});
