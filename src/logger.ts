export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const SENSITIVE_KEYS = ["password", "token", "secret", "key", "auth", "cookie", "authorization"];

interface LogContext {
  [key: string]: unknown;
}

/**
 * Structured logger that writes to stderr (safe for stdio MCP transport).
 * Supports child loggers with a fixed module prefix.
 */
export class Logger {
  private readonly level: number;
  private readonly module?: string;

  constructor(level: LogLevel = "info", module?: string) {
    this.level = LEVEL_PRIORITY[level];
    this.module = module;
  }

  /** Create a child logger with a module prefix. */
  child(module: string): Logger {
    const prefix = this.module ? `${this.module}:${module}` : module;
    return new Logger(
      (Object.entries(LEVEL_PRIORITY).find(([, v]) => v === this.level)?.[0] as LogLevel) ?? "info",
      prefix,
    );
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_PRIORITY[level] < this.level) return;

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      ...(this.module && { module: this.module }),
      message,
    };

    if (context) {
      entry.context = this.sanitize(context);
    }

    // All output goes to stderr to avoid interfering with stdio transport
    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  private sanitize(context: LogContext): LogContext {
    const result: LogContext = {};
    for (const [key, value] of Object.entries(context)) {
      if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk))) {
        result[key] = "[REDACTED]";
      } else if (value instanceof Error) {
        result[key] = { name: value.name, message: value.message, stack: value.stack };
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
