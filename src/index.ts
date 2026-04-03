import { loadConfig } from "./config.js";
import { Logger } from "./logger.js";
import { createMcpServer } from "./server.js";
import { startStdioTransport } from "./transport/stdio.js";
import { startHttpTransport } from "./transport/http.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.LOG_LEVEL);

  if (config.MCP_TRANSPORT === "http") {
    // HTTP mode: each session gets its own Server instance (see startHttpTransport).
    await startHttpTransport(() => createMcpServer(config, logger), config.MCP_HTTP_PORT, logger);
  } else {
    await startStdioTransport(createMcpServer(config, logger), logger);
  }
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
