import type { CallToolRequest, CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";
import type { ToolRegistry } from "./registry.js";
import { invalidParams, ToolError } from "../../utils/mcp-error.js";
import { withTimeout, getToolTimeout, TimeoutError } from "../../utils/timeout.js";
import type { Logger } from "../../logger.js";

/**
 * Create the CallTool dispatcher for one server's tool registry.
 * Routes requests to the correct handler, applies timeout, and normalizes errors:
 * - A malformed call (unknown tool, arguments that fail the tool's schema) is a
 *   protocol error (InvalidParams).
 * - A failure while running the tool (upstream API error, timeout) is returned as a
 *   CallToolResult with `isError: true`, so the model sees it and can recover. Only
 *   ToolError messages are forwarded; anything else becomes a generic message.
 * Threads an AbortSignal into each handler so that timed-out operations can
 * cancel in-flight I/O rather than just being abandoned.
 */
export function createCallToolHandler(
  registry: ToolRegistry,
  defaultTimeoutMs: number,
  logger: Logger,
) {
  return async (request: CallToolRequest): Promise<CallToolResult> => {
    const { name, arguments: args = {} } = request.params;
    const timeout = getToolTimeout(name, defaultTimeoutMs);

    const handler = registry.getHandler(name);
    if (!handler) {
      throw invalidParams(`Unknown tool: ${name}`);
    }

    try {
      return await withTimeout((signal) => handler(args, signal), timeout, name);
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        logger.warn("Tool input validation failed", { toolName: name, issues });
        throw invalidParams(`Invalid input for tool '${name}': ${issues}`);
      }

      if (error instanceof TimeoutError) {
        logger.error("Tool execution timed out", { toolName: name, timeout });
        return toolErrorResult(`Tool '${name}' timed out after ${timeout}ms`);
      }

      logger.error("Tool execution failed", { toolName: name, error });
      return toolErrorResult(
        error instanceof ToolError
          ? `Tool '${name}' failed: ${error.message}`
          : `Tool '${name}' failed due to an internal error`,
      );
    }
  };
}

function toolErrorResult(text: string): CallToolResult {
  return { content: [{ type: "text", text }], isError: true };
}
