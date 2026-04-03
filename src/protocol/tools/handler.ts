import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import { getToolHandler } from "./registry.js";
import { invalidRequest, toMcpError } from "../../utils/mcp-error.js";
import { withTimeout, getToolTimeout, TimeoutError } from "../../utils/timeout.js";
import type { Logger } from "../../logger.js";

/**
 * Create the CallTool dispatcher.
 * Routes requests to the correct handler, applies timeout, and normalizes errors.
 */
export function createCallToolHandler(defaultTimeoutMs: number, logger: Logger) {
  return async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name, arguments: args = {} } = request.params;
    const timeout = getToolTimeout(name, defaultTimeoutMs);

    const handler = getToolHandler(name);
    if (!handler) {
      throw invalidRequest(`Unknown tool: ${name}`);
    }

    try {
      return await withTimeout(handler(args), timeout, name);
    } catch (error) {
      return handleToolError(error, name, timeout, logger);
    }
  };
}

function handleToolError(
  error: unknown,
  name: string,
  timeout: number,
  logger: Logger,
): never {
  if (error instanceof TimeoutError) {
    logger.error("Tool execution timed out", { toolName: name, timeout });
    throw invalidRequest(`Tool '${name}' timed out after ${timeout}ms`);
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
    logger.warn("Tool input validation failed", { toolName: name, issues });
    throw invalidRequest(`Invalid input for tool '${name}': ${issues}`);
  }

  logger.error("Tool execution failed", { toolName: name, error });
  throw toMcpError(error, `Tool '${name}' execution failed`);
}
