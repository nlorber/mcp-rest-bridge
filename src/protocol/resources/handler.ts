import type { Resource, TextResourceContents } from "@modelcontextprotocol/sdk/types.js";
import { registerScheme, routeUri } from "./uri-router.js";
import { loadMetadata, loadPromptFile } from "../prompts/loader.js";
import { invalidRequest } from "../../utils/mcp-error.js";
import type { Config } from "../../config.js";

/**
 * Initialize all resource scheme handlers and return static resource list.
 */
export function initializeResources(config: Config): Resource[] {
  const resources: Resource[] = [];

  // Scheme: prompt:// — expose prompt templates as readable resources
  registerScheme("prompt", handlePromptResource);
  // Resources will be built dynamically at list time, but we register known ones

  // Scheme: config:// — expose non-sensitive server configuration
  registerScheme("config", handleConfigResource(config));
  resources.push({
    uri: "config://server/settings",
    name: "Server Configuration",
    description: "Non-sensitive server configuration (transport, timeouts, cache)",
    mimeType: "application/json",
  });

  // Scheme: api:// — expose API spec / metadata
  registerScheme("api", handleApiResource(config));
  resources.push({
    uri: "api://mock/spec",
    name: "API Specification",
    description: "Overview of the target REST API endpoints",
    mimeType: "application/json",
  });

  return resources;
}

/**
 * Build the full list of resources (static + dynamic prompt resources).
 */
export async function handleListResources(
  staticResources: Resource[],
): Promise<{ resources: Resource[] }> {
  const metadata = await loadMetadata();

  const promptResources: Resource[] = metadata.map((prompt) => ({
    uri: `prompt://templates/${prompt.id}`,
    name: prompt.name,
    description: prompt.description,
    mimeType: "text/markdown",
  }));

  return { resources: [...staticResources, ...promptResources] };
}

/**
 * Handle ReadResource — dispatch to the appropriate scheme handler.
 */
export async function handleReadResource(
  uri: string,
): Promise<{ contents: [TextResourceContents] }> {
  const contents = await routeUri(uri);
  return { contents: [contents] };
}

async function handlePromptResource(uri: string): Promise<TextResourceContents> {
  const match = uri.match(/^prompt:\/\/templates\/(.+)$/);
  if (!match) throw invalidRequest(`Invalid prompt URI: ${uri}`);

  const promptId = match[1];
  const metadata = await loadMetadata();
  const promptMeta = metadata.find((p) => p.id === promptId);
  if (!promptMeta) throw invalidRequest(`Prompt not found: ${promptId}`);

  const content = await loadPromptFile(promptMeta.file);

  const header = [
    `---`,
    `id: ${promptMeta.id}`,
    `name: ${promptMeta.name}`,
    `description: ${promptMeta.description}`,
    `arguments:`,
    ...promptMeta.arguments.map(
      (a) => `  - ${a.name}: ${a.description}${a.required ? " (required)" : ""}`,
    ),
    `---`,
    "",
  ].join("\n");

  return { uri, mimeType: "text/markdown", text: header + content };
}

function handleConfigResource(config: Config) {
  return async (uri: string): Promise<TextResourceContents> => {
    if (uri !== "config://server/settings") {
      throw invalidRequest(`Unknown config resource: ${uri}`);
    }

    // Expose only non-sensitive configuration
    const safeConfig = {
      transport: config.MCP_TRANSPORT,
      httpPort: config.MCP_HTTP_PORT,
      apiBaseUrl: config.API_BASE_URL,
      httpTimeoutMs: config.HTTP_TIMEOUT_MS,
      defaultToolTimeoutMs: config.DEFAULT_TOOL_TIMEOUT_MS,
      cacheTtlMs: config.CACHE_TTL_MS,
      logLevel: config.LOG_LEVEL,
    };

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(safeConfig, null, 2),
    };
  };
}

function handleApiResource(config: Config) {
  return async (uri: string): Promise<TextResourceContents> => {
    if (uri !== "api://mock/spec") {
      throw invalidRequest(`Unknown API resource: ${uri}`);
    }

    const spec = {
      name: "Mock REST API",
      version: "1.0.0",
      baseUrl: config.API_BASE_URL,
      endpoints: [
        { method: "POST", path: "/auth/token", description: "Acquire JWT token" },
        { method: "GET", path: "/items", description: "List items (paginated)" },
        { method: "GET", path: "/items/:id", description: "Get item details" },
        { method: "POST", path: "/items", description: "Create item" },
        { method: "PATCH", path: "/items/:id", description: "Update item" },
        { method: "DELETE", path: "/items/:id", description: "Delete item" },
        { method: "GET", path: "/categories", description: "List categories" },
        { method: "GET", path: "/categories/:id", description: "Get category details" },
      ],
    };

    return {
      uri,
      mimeType: "application/json",
      text: JSON.stringify(spec, null, 2),
    };
  };
}
