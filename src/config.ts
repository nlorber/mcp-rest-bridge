import { z } from "zod";

const configSchema = z.object({
  /** Transport mode: stdio (default) or http */
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),

  /** Port for HTTP transport */
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3456),

  /** Base URL of the target REST API */
  API_BASE_URL: z.string().url().default("http://localhost:3100"),

  /** API credentials */
  API_USERNAME: z.string().default("admin"),
  API_PASSWORD: z.string().default("admin123"),

  /** Log level */
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  /** HTTP request timeout in ms */
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),

  /** Default tool execution timeout in ms */
  DEFAULT_TOOL_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),

  /** Cache TTL in ms */
  CACHE_TTL_MS: z.coerce.number().int().positive().default(300_000),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables.
 */
export function loadConfig(): Config {
  return configSchema.parse(process.env);
}
