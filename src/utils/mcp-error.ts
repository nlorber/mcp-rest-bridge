import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";

/**
 * A tool execution failure whose message is written by the bridge and safe to show
 * the model. The CallTool dispatcher returns it as an `isError` tool result; any
 * other error thrown by a tool surfaces only as a generic failure.
 */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/**
 * Create an InvalidRequest MCP error (bad user input, missing params).
 */
export function invalidRequest(message: string): McpError {
  return new McpError(ErrorCode.InvalidRequest, message);
}

/**
 * Create an InvalidParams MCP error (unknown tool, arguments that fail a tool's schema).
 */
export function invalidParams(message: string): McpError {
  return new McpError(ErrorCode.InvalidParams, message);
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
