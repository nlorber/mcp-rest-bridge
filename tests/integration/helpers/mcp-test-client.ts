import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";
import { Logger } from "../../../src/logger.js";
import { getTools, clearTools } from "../../../src/protocol/tools/registry.js";
import { createCallToolHandler } from "../../../src/protocol/tools/handler.js";
import { handleListPrompts, handleGetPrompt } from "../../../src/protocol/prompts/handler.js";
import {
  initializeResources,
  handleListResources,
  handleReadResource,
} from "../../../src/protocol/resources/handler.js";
import { clearSchemes } from "../../../src/protocol/resources/uri-router.js";
import { toMcpError } from "../../../src/utils/mcp-error.js";
import { registerAllTools } from "../../../src/tools/index.js";
import type { HttpClient } from "../../../src/api/client.js";

const logger = new Logger("error");

const DEFAULT_CONFIG = {
  MCP_TRANSPORT: "stdio" as const,
  MCP_HTTP_PORT: 3456,
  API_BASE_URL: "http://localhost:3100",
  API_USERNAME: "admin",
  API_PASSWORD: "admin123",
  LOG_LEVEL: "error" as const,
  HTTP_TIMEOUT_MS: 30000,
  DEFAULT_TOOL_TIMEOUT_MS: 60000,
  CACHE_TTL_MS: 300000,
};

/**
 * Create a mock HttpClient for testing.
 */
export function createMockHttpClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as HttpClient & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

/**
 * Create a connected MCP client-server pair for integration testing.
 * Returns the client and the mock HttpClient for setting up expectations.
 */
export async function createTestClient() {
  // Reset global state
  clearTools();
  clearSchemes();

  const mockHttpClient = createMockHttpClient();
  registerAllTools(mockHttpClient as unknown as HttpClient);

  const server = new Server(
    { name: "test-server", version: "0.0.1" },
    {
      capabilities: { tools: {}, prompts: {}, resources: {} },
    },
  );

  const staticResources = initializeResources(DEFAULT_CONFIG);

  // Register handlers
  server.setRequestHandler(ListToolsRequestSchema, () =>
    Promise.resolve({ tools: getTools() }),
  );

  const callToolHandler = createCallToolHandler(60000, logger);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await callToolHandler(request);
    } catch (error) {
      throw toMcpError(error);
    }
  });

  server.setRequestHandler(ListPromptsRequestSchema, () => handleListPrompts());
  server.setRequestHandler(GetPromptRequestSchema, (request) =>
    handleGetPrompt(request.params.name, request.params.arguments),
  );

  server.setRequestHandler(ListResourcesRequestSchema, () =>
    handleListResources(staticResources),
  );
  server.setRequestHandler(ReadResourceRequestSchema, (request) =>
    handleReadResource(request.params.uri),
  );

  // Connect via in-memory transport
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.1" });

  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

  return { client, mockHttpClient, server };
}

/**
 * Parse the JSON data from a tool response text (strips [INSTRUCTIONS] prefix).
 */
export function parseToolText(text: string): unknown {
  const jsonStart = text.indexOf("{");
  if (jsonStart === -1) return text;
  return JSON.parse(text.slice(jsonStart));
}
