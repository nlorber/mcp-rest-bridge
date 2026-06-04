import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/config.js";
import { Logger } from "../../src/logger.js";
import { clearSchemes } from "../../src/protocol/resources/uri-router.js";
import { clearTools } from "../../src/protocol/tools/registry.js";
import { createMcpServer } from "../../src/server.js";
import { startStdioTransport } from "../../src/transport/stdio.js";

// createMcpServer registers tools and URI schemes in module-level registries;
// reset them around each test so repeated construction stays isolated.
beforeEach(() => {
  clearTools();
  clearSchemes();
});
afterEach(() => {
  clearTools();
  clearSchemes();
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
});

describe("startStdioTransport", () => {
  it("connects the server over a stdio transport", async () => {
    const server = createMcpServer(loadConfig(), new Logger("error"));
    const connectSpy = vi.spyOn(server, "connect").mockResolvedValue(undefined);

    await startStdioTransport(server, new Logger("error"));

    expect(connectSpy).toHaveBeenCalledOnce();
  });
});
