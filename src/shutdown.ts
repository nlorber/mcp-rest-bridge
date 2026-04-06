import { Logger } from "./logger.js";

const FORCE_EXIT_MS = 10_000;

/**
 * Register process signal handlers for graceful shutdown.
 * The cleanup function should close servers, transports, and flush logs.
 */
export function registerShutdown(cleanup: () => Promise<void>, logger: Logger): void {
  let shuttingDown = false;

  const handler = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info("shutdown signal received", { signal });

    const forceExit = setTimeout(() => {
      logger.error("shutdown timed out, forcing exit");
      process.exit(1);
    }, FORCE_EXIT_MS);
    forceExit.unref();

    let cleanupFailed = false;
    try {
      await cleanup();
    } catch (error) {
      cleanupFailed = true;
      logger.error("error during shutdown", { error: String(error) });
    }

    process.exit(cleanupFailed ? 1 : 0);
  };

  process.on("SIGTERM", () => handler("SIGTERM"));
  process.on("SIGINT", () => handler("SIGINT"));
}
