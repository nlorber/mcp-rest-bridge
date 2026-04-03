import type { TextResourceContents } from "@modelcontextprotocol/sdk/types.js";
import { invalidRequest } from "../../utils/mcp-error.js";

type ResourceReader = (uri: string) => Promise<TextResourceContents>;

const schemeHandlers = new Map<string, ResourceReader>();

/**
 * Register a handler for a URI scheme (e.g. "api", "config", "prompt").
 */
export function registerScheme(scheme: string, handler: ResourceReader): void {
  schemeHandlers.set(scheme, handler);
}

/**
 * Route a URI to the appropriate scheme handler.
 */
export async function routeUri(uri: string): Promise<TextResourceContents> {
  const schemeMatch = uri.match(/^(\w+):\/\//);
  if (!schemeMatch) {
    throw invalidRequest(`Invalid resource URI: ${uri}`);
  }

  const scheme = schemeMatch[1];
  const handler = schemeHandlers.get(scheme);
  if (!handler) {
    throw invalidRequest(`Unknown resource scheme: ${scheme}`);
  }

  return handler(uri);
}

/**
 * Clear all registered schemes (for testing).
 */
export function clearSchemes(): void {
  schemeHandlers.clear();
}
