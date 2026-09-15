import { HttpError } from "./client.js";
import { ToolError } from "../utils/mcp-error.js";

/**
 * Map API failures to ToolErrors whose messages are safe to show the model.
 * Upstream response bodies never reach the message: they are untrusted and can carry
 * internal details, so HttpClient logs them server-side instead. Errors this function
 * does not recognize are rethrown unchanged and surface as a generic failure.
 * Call this in tool handlers' catch blocks.
 */
export function mapApiError(error: unknown): never {
  if (error instanceof HttpError) {
    throw new ToolError(messageForStatus(error));
  }

  if (error instanceof DOMException && error.name === "TimeoutError") {
    throw new ToolError("API request timed out");
  }

  throw error;
}

function messageForStatus(error: HttpError): string {
  switch (error.status) {
    case 400:
      return "Bad request: the API rejected the input";
    case 401:
      return "Authentication failed — check your API credentials";
    case 403:
      return "Access denied — insufficient permissions";
    case 404:
      return `Not found: ${error.method} ${error.path}`;
    case 409:
      return "Conflict: the request conflicts with the current state of the resource";
    case 429:
      return "Rate limited — please try again later";
    default:
      return error.status >= 500
        ? `API server error (${error.status})`
        : `API error (${error.status})`;
  }
}
