import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A tool definition bundles the MCP tool metadata with its execution handler.
 * The handler receives the parsed arguments and an AbortSignal that fires when
 * the tool-level timeout elapses, allowing in-flight I/O to be cancelled.
 */
export interface ToolDefinition {
  tool: Tool;
  handler: (args: Record<string, unknown>, signal: AbortSignal) => Promise<CallToolResult>;
}

/**
 * The tools one server instance serves. Each MCP server owns a registry, because the
 * HTTP transport creates a Server per session: a shared registry would let the newest
 * session's handlers — bound to that session's HTTP client — serve every open session.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  /**
   * Register a tool. A later registration under the same name replaces the earlier one.
   */
  register(definition: ToolDefinition): void {
    this.tools.set(definition.tool.name, definition);
  }

  /**
   * All registered tool metadata (for ListToolsRequest).
   */
  list(): Tool[] {
    return Array.from(this.tools.values()).map((d) => d.tool);
  }

  /**
   * Look up a tool handler by name (for CallToolRequest).
   */
  getHandler(name: string): ToolDefinition["handler"] | undefined {
    return this.tools.get(name)?.handler;
  }
}
