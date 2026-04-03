import { HttpError } from "./client.js";
import { invalidRequest, internalError, toMcpError } from "../utils/mcp-error.js";

/**
 * Map API errors (HTTP status codes) to appropriate MCP errors.
 * Call this in tool handlers' catch blocks.
 */
export function mapApiError(error: unknown): never {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 400:
        throw invalidRequest(`Bad request: ${error.body}`);
      case 401:
        throw invalidRequest("Authentication failed — check your API credentials");
      case 403:
        throw invalidRequest("Access denied — insufficient permissions");
      case 404:
        throw invalidRequest(`Not found: ${error.method} ${error.path}`);
      case 409:
        throw invalidRequest(`Conflict: ${error.body}`);
      case 429:
        throw invalidRequest("Rate limited — please try again later");
      default:
        if (error.status >= 500) {
          throw internalError(`API server error (${error.status}): ${error.body}`);
        }
        throw invalidRequest(`API error (${error.status}): ${error.body}`);
    }
  }

  throw toMcpError(error, "API request failed");
}
