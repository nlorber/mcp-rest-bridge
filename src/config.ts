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

  /** Rate limiter: max burst tokens per IP */
  RATE_LIMIT_MAX_TOKENS: z.coerce.number().int().positive().default(60),

  /** Rate limiter: token refill rate per second */
  RATE_LIMIT_REFILL_RATE: z.coerce.number().positive().default(2),

  /**
   * HTTP transport: Express "trust proxy" value. "true" / "false", a hop count, or an
   * address list such as "loopback". Unset leaves it off and logs a startup warning.
   */
  MCP_TRUST_PROXY: z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === "true" || v === "false") return v === "true";
      return /^\d+$/.test(v) ? Number(v) : v;
    }),

  /** HTTP transport: refuse to start while MCP_TRUST_PROXY is unset */
  MCP_REQUIRE_TRUST_PROXY: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),

  /** HTTP transport: maximum concurrent sessions (transport default when unset) */
  MCP_MAX_SESSIONS: z.coerce.number().int().positive().optional(),

  /** HTTP transport: evict sessions idle longer than this, in ms (transport default when unset) */
  MCP_SESSION_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables.
 */
export function loadConfig(): Config {
  return configSchema.parse(process.env);
}
