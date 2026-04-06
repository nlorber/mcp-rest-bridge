import { loadConfig } from "./config.js";
import { Logger } from "./logger.js";
import { createMcpServer } from "./server.js";
import { startStdioTransport } from "./transport/stdio.js";
import { startHttpTransport } from "./transport/http.js";
import { registerShutdown } from "./shutdown.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = new Logger(config.LOG_LEVEL);

  if (config.MCP_TRANSPORT === "http") {
    const httpServer = await startHttpTransport(
      () => createMcpServer(config, logger),
      config.MCP_HTTP_PORT,
      logger,
      { maxTokens: config.RATE_LIMIT_MAX_TOKENS, refillRatePerSec: config.RATE_LIMIT_REFILL_RATE },
    );
    registerShutdown(async () => {
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
        httpServer.closeAllConnections();
      });
      logger.info("HTTP server closed");
    }, logger);
  } else {
    const server = createMcpServer(config, logger);
    await startStdioTransport(server, logger);
    registerShutdown(async () => {
      await server.close();
      logger.info("stdio transport closed");
    }, logger);
  }
}

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
