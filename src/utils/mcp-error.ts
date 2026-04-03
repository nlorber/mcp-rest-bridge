import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * Create an InvalidRequest MCP error (bad user input, missing params).
 */
export function invalidRequest(message: string): McpError {
  return new McpError(ErrorCode.InvalidRequest, message);
}

/**
 * Create an InternalError MCP error (unexpected server-side failure).
 */
export function internalError(message: string): McpError {
  return new McpError(ErrorCode.InternalError, message);
}

/**
 * Convert any error into an appropriate MCP error.
 */
export function toMcpError(error: unknown, context?: string): McpError {
  if (error instanceof McpError) return error;

  if (error instanceof Error) {
    const message = context ? `${context}: ${error.message}` : error.message;
    return internalError(message);
  }

  const message = context ? `${context}: ${String(error)}` : String(error);
  return internalError(message);
}
