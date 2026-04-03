import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/config.js";

const CONFIG_KEYS = [
  "MCP_TRANSPORT",
  "MCP_HTTP_PORT",
  "API_BASE_URL",
  "API_USERNAME",
  "API_PASSWORD",
  "LOG_LEVEL",
  "HTTP_TIMEOUT_MS",
  "DEFAULT_TOOL_TIMEOUT_MS",
  "CACHE_TTL_MS",
];

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of CONFIG_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of CONFIG_KEYS) {
    if (saved[key] !== undefined) {
      process.env[key] = saved[key];
    } else {
      delete process.env[key];
    }
  }
});

describe("loadConfig", () => {
  it("returns all defaults when no env vars are set", () => {
    const config = loadConfig();
    expect(config.MCP_TRANSPORT).toBe("stdio");
    expect(config.MCP_HTTP_PORT).toBe(3456);
    expect(config.API_BASE_URL).toBe("http://localhost:3100");
    expect(config.API_USERNAME).toBe("admin");
    expect(config.API_PASSWORD).toBe("admin123");
    expect(config.LOG_LEVEL).toBe("info");
    expect(config.HTTP_TIMEOUT_MS).toBe(30_000);
    expect(config.DEFAULT_TOOL_TIMEOUT_MS).toBe(60_000);
    expect(config.CACHE_TTL_MS).toBe(300_000);
  });

  it("accepts valid overrides for all fields", () => {
    process.env.MCP_TRANSPORT = "http";
    process.env.MCP_HTTP_PORT = "8080";
    process.env.API_BASE_URL = "https://api.example.com";
    process.env.API_USERNAME = "user1";
    process.env.API_PASSWORD = "secret";
    process.env.LOG_LEVEL = "debug";
    process.env.HTTP_TIMEOUT_MS = "5000";
    process.env.DEFAULT_TOOL_TIMEOUT_MS = "10000";
    process.env.CACHE_TTL_MS = "60000";

    const config = loadConfig();
    expect(config.MCP_TRANSPORT).toBe("http");
    expect(config.MCP_HTTP_PORT).toBe(8080);
    expect(config.API_BASE_URL).toBe("https://api.example.com");
    expect(config.API_USERNAME).toBe("user1");
    expect(config.API_PASSWORD).toBe("secret");
    expect(config.LOG_LEVEL).toBe("debug");
    expect(config.HTTP_TIMEOUT_MS).toBe(5000);
    expect(config.DEFAULT_TOOL_TIMEOUT_MS).toBe(10000);
    expect(config.CACHE_TTL_MS).toBe(60000);
  });

  it("coerces numeric strings to numbers", () => {
    process.env.MCP_HTTP_PORT = "9000";
    process.env.HTTP_TIMEOUT_MS = "1000";
    process.env.DEFAULT_TOOL_TIMEOUT_MS = "2000";
    process.env.CACHE_TTL_MS = "3000";

    const config = loadConfig();
    expect(typeof config.MCP_HTTP_PORT).toBe("number");
    expect(typeof config.HTTP_TIMEOUT_MS).toBe("number");
    expect(typeof config.DEFAULT_TOOL_TIMEOUT_MS).toBe("number");
    expect(typeof config.CACHE_TTL_MS).toBe("number");
  });

  it("rejects invalid transport value", () => {
    process.env.MCP_TRANSPORT = "websocket";
    expect(() => loadConfig()).toThrow();
  });

  it("rejects invalid URL for API_BASE_URL", () => {
    process.env.API_BASE_URL = "not-a-url";
    expect(() => loadConfig()).toThrow();
  });

  it("rejects negative port number", () => {
    process.env.MCP_HTTP_PORT = "-1";
    expect(() => loadConfig()).toThrow();
  });

  it("rejects non-numeric port string", () => {
    process.env.MCP_HTTP_PORT = "abc";
    expect(() => loadConfig()).toThrow();
  });

  it("rejects invalid log level", () => {
    process.env.LOG_LEVEL = "verbose";
    expect(() => loadConfig()).toThrow();
  });
});
