import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Logger } from "../logger.js";

/**
 * Start the MCP server with stdio transport (for Claude Desktop, Claude Code).
 */
export async function startStdioTransport(server: Server, logger: Logger): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("server started", { transport: "stdio" });
}
