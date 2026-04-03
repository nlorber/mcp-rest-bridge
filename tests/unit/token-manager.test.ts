import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TokenManager } from "../../src/api/auth/token-manager.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");

// Mock a successful auth response
function mockFetchSuccess(token = "mock.jwt.token", expiresIn = 3600) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
    }),
  });
}

describe("TokenManager", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should acquire a token on first call", async () => {
    globalThis.fetch = mockFetchSuccess("test.jwt.token") as unknown as typeof fetch;
    const tm = new TokenManager("http://localhost:3100", { username: "admin", password: "pass" }, logger);

    const token = await tm.getToken();
    expect(token).toBe("test.jwt.token");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should cache the token on subsequent calls", async () => {
    globalThis.fetch = mockFetchSuccess() as unknown as typeof fetch;
    const tm = new TokenManager("http://localhost:3100", { username: "admin", password: "pass" }, logger);

    await tm.getToken();
    await tm.getToken();
    await tm.getToken();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should deduplicate concurrent requests", async () => {
    globalThis.fetch = mockFetchSuccess() as unknown as typeof fetch;
    const tm = new TokenManager("http://localhost:3100", { username: "admin", password: "pass" }, logger);

    const [t1, t2, t3] = await Promise.all([tm.getToken(), tm.getToken(), tm.getToken()]);
    expect(t1).toBe(t2);
    expect(t2).toBe(t3);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("should clear token and re-authenticate after updateCredentials", async () => {
    globalThis.fetch = mockFetchSuccess() as unknown as typeof fetch;
    const tm = new TokenManager("http://localhost:3100", { username: "admin", password: "pass" }, logger);

    await tm.getToken();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    tm.updateCredentials("newuser", "newpass");
    await tm.getToken();
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("should throw on authentication failure", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Invalid credentials",
    }) as unknown as typeof fetch;

    const tm = new TokenManager("http://localhost:3100", { username: "bad", password: "bad" }, logger);
    await expect(tm.getToken()).rejects.toThrow("Authentication failed");
  });

  describe("decodePayload", () => {
    it("should decode a JWT payload", () => {
      // Create a simple JWT with known payload
      const payload = { sub: 1, username: "admin", role: "admin" };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const fakeJwt = `header.${encoded}.signature`;

      const decoded = TokenManager.decodePayload(fakeJwt);
      expect(decoded.sub).toBe(1);
      expect(decoded.username).toBe("admin");
    });

    it("should throw on invalid JWT format", () => {
      expect(() => TokenManager.decodePayload("not-a-jwt")).toThrow("Invalid JWT format");
    });
  });
});
