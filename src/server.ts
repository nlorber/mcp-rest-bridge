import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { Config } from "./config.js";
import type { Logger } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Walk up to find package.json: works both in dev (src/) and build (build/src/)
function findPackageJson(): string {
  for (const rel of ["../package.json", "../../package.json"]) {
    const candidate = resolve(__dirname, rel);
    try {
      return readFileSync(candidate, "utf-8");
    } catch {
      continue;
    }
  }
  throw new Error("package.json not found relative to " + __dirname);
}
const pkg = JSON.parse(findPackageJson()) as { name: string; version: string };
import { getTools } from "./protocol/tools/registry.js";
import { createCallToolHandler } from "./protocol/tools/handler.js";
import { handleListPrompts, handleGetPrompt } from "./protocol/prompts/handler.js";
import {
  initializeResources,
  handleListResources,
  handleReadResource,
} from "./protocol/resources/handler.js";
import { toMcpError } from "./utils/mcp-error.js";
import { TokenManager } from "./api/auth/token-manager.js";
import { HttpClient } from "./api/client.js";
import { registerAllTools } from "./tools/index.js";

/**
 * Create and configure the MCP server with all protocol handlers.
 */
export function createMcpServer(config: Config, logger: Logger): Server {
  // API layer: auth + HTTP client
  const tokenManager = new TokenManager(
    config.API_BASE_URL,
    { username: config.API_USERNAME, password: config.API_PASSWORD },
    logger,
  );
  const httpClient = new HttpClient(config.API_BASE_URL, tokenManager, config.HTTP_TIMEOUT_MS, logger);

  // Register all tools (must happen before server starts handling requests)
  registerAllTools(httpClient);

  const server = new Server(
    {
      name: pkg.name,
      version: pkg.version,
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
        resources: {},
      },
      // CUSTOMIZE: replace with instructions relevant to your API's domain
      instructions: [
        "You are connected to a REST API via MCP tools.",
        "Use list_items to browse inventory, get_item for details.",
        "Use list_categories to see available categories.",
        "Always confirm before creating, updating, or deleting items.",
      ].join(" "),
    },
  );

  // Initialize resources (registers URI scheme handlers, returns static resources)
  const staticResources = initializeResources(config);

  // --- Tool handlers ---
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return Promise.resolve({ tools: getTools() });
  });

  const callToolHandler = createCallToolHandler(config.DEFAULT_TOOL_TIMEOUT_MS, logger);
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await callToolHandler(request);
    } catch (error) {
      logger.error("CallTool failed", { toolName: request.params.name, error });
      throw toMcpError(error, "CallTool failed");
    }
  });

  // --- Prompt handlers ---
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      return await handleListPrompts();
    } catch (error) {
      logger.error("ListPrompts failed", { error });
      throw toMcpError(error, "ListPrompts failed");
    }
  });

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    try {
      return await handleGetPrompt(request.params.name, request.params.arguments);
    } catch (error) {
      logger.error("GetPrompt failed", { promptName: request.params.name, error });
      throw toMcpError(error, "GetPrompt failed");
    }
  });

  // --- Resource handlers ---
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      return await handleListResources(staticResources);
    } catch (error) {
      logger.error("ListResources failed", { error });
      throw toMcpError(error, "ListResources failed");
    }
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    try {
      return await handleReadResource(request.params.uri);
    } catch (error) {
      logger.error("ReadResource failed", { uri: request.params.uri, error });
      throw toMcpError(error, "ReadResource failed");
    }
  });

  logger.info("MCP server created", { name: pkg.name, version: pkg.version });

  return server;
}
