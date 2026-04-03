import type { Tool, CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A tool definition bundles the MCP tool metadata with its execution handler.
 */
export interface ToolDefinition {
  tool: Tool;
  handler: (args: Record<string, unknown>) => Promise<CallToolResult>;
}

const tools = new Map<string, ToolDefinition>();

/**
 * Register a tool in the global registry.
 */
export function registerTool(definition: ToolDefinition): void {
  tools.set(definition.tool.name, definition);
}

/**
 * Get all registered tool metadata (for ListToolsRequest).
 */
export function getTools(): Tool[] {
  return Array.from(tools.values()).map((d) => d.tool);
}

/**
 * Look up a tool handler by name (for CallToolRequest).
 */
export function getToolHandler(
  name: string,
): ((args: Record<string, unknown>) => Promise<CallToolResult>) | undefined {
  return tools.get(name)?.handler;
}

/**
 * Clear all registered tools (useful for testing).
 */
export function clearTools(): void {
  tools.clear();
}
