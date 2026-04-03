import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger } from "../../src/logger.js";

describe("Logger", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stderrSpy: any;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  function getLastLog(): Record<string, unknown> {
    const lastCall = stderrSpy.mock.calls[stderrSpy.mock.calls.length - 1][0] as string;
    return JSON.parse(lastCall.trim()) as Record<string, unknown>;
  }

  describe("level filtering", () => {
    it("warn-level logger skips debug and info, logs warn and error", () => {
      const logger = new Logger("warn");
      logger.debug("debug msg");
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");
      expect(stderrSpy).toHaveBeenCalledTimes(2);
      expect(getLastLog().level).toBe("error");
    });

    it("debug-level logger logs all 4 levels", () => {
      const logger = new Logger("debug");
      logger.debug("debug msg");
      logger.info("info msg");
      logger.warn("warn msg");
      logger.error("error msg");
      expect(stderrSpy).toHaveBeenCalledTimes(4);
    });
  });

  describe("output format", () => {
    it("has timestamp (string), level, and message fields", () => {
      const logger = new Logger("info");
      logger.info("hello world");
      const log = getLastLog();
      expect(typeof log.timestamp).toBe("string");
      expect(log.level).toBe("info");
      expect(log.message).toBe("hello world");
    });

    it("includes context when provided", () => {
      const logger = new Logger("info");
      logger.info("with context", { userId: 42 });
      const log = getLastLog();
      expect(log.context).toEqual({ userId: 42 });
    });

    it("omits context when not provided", () => {
      const logger = new Logger("info");
      logger.info("no context");
      const log = getLastLog();
      expect(log).not.toHaveProperty("context");
    });
  });

  describe("sensitive key redaction", () => {
    it('redacts "password" and "token" keys, keeps "username"', () => {
      const logger = new Logger("info");
      logger.info("login attempt", { username: "alice", password: "s3cr3t", token: "abc123" });
      const ctx = getLastLog().context as Record<string, unknown>;
      expect(ctx.username).toBe("alice");
      expect(ctx.password).toBe("[REDACTED]");
      expect(ctx.token).toBe("[REDACTED]");
    });

    it('redacts "authorization" and "apiKey" via substring matching', () => {
      const logger = new Logger("info");
      logger.info("request", { authorization: "Bearer xyz", apiKey: "key-value" });
      const ctx = getLastLog().context as Record<string, unknown>;
      expect(ctx.authorization).toBe("[REDACTED]");
      expect(ctx.apiKey).toBe("[REDACTED]");
    });
  });

  describe("Error serialization", () => {
    it("serializes Error instances in context to {name, message, stack}", () => {
      const logger = new Logger("info");
      const err = new Error("something went wrong");
      logger.error("operation failed", { err });
      const ctx = getLastLog().context as Record<string, unknown>;
      const serialized = ctx.err as Record<string, unknown>;
      expect(serialized.name).toBe("Error");
      expect(serialized.message).toBe("something went wrong");
      expect(typeof serialized.stack).toBe("string");
    });
  });

  describe("child logger", () => {
    it("includes module field in output", () => {
      const logger = new Logger("info", "parent");
      const child = logger.child("child");
      child.info("test");
      const log = getLastLog();
      expect(log.module).toBe("parent:child");
    });

    it("shows chained module as parent:child format", () => {
      const logger = new Logger("info");
      const child = logger.child("parent");
      const grandchild = child.child("child");
      grandchild.info("test");
      const log = getLastLog();
      expect(log.module).toBe("parent:child");
    });
  });
});
