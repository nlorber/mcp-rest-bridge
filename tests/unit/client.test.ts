import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpClient, HttpError } from "../../src/api/client.js";
import type { TokenManager } from "../../src/api/auth/token-manager.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");

const tokenManager = {
  getToken: vi.fn().mockResolvedValue("test-token"),
} as unknown as TokenManager;

function makeClient(baseUrl = "http://localhost:3000") {
  return new HttpClient(baseUrl, tokenManager, 5000, logger);
}

function mockFetch(overrides: Partial<{ ok: boolean; status: number; json: () => Promise<unknown>; text: () => Promise<string> }> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ result: "ok" }),
    text: async () => "",
    ...overrides,
  });
}

describe("HttpClient", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.mocked(tokenManager.getToken).mockResolvedValue("test-token");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("GET sends Bearer token from tokenManager", async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
    const client = makeClient();

    await client.get("/items");

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer test-token",
    });
  });

  it("GET builds URL with query params, skipping undefined values", async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
    const client = makeClient("http://localhost:3000");

    await client.get("/search", { params: { q: "hello", page: 2, skip: undefined } });

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect(url).toContain("q=hello");
    expect(url).toContain("page=2");
    expect(url).not.toContain("skip");
  });

  it("POST sends JSON body with Content-Type header", async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
    const client = makeClient();

    await client.post("/items", { body: { name: "widget" } });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({ "Content-Type": "application/json" });
    expect((init as RequestInit).body).toBe(JSON.stringify({ name: "widget" }));
  });

  it("PATCH sends JSON body", async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
    const client = makeClient();

    await client.patch("/items/1", { body: { name: "updated" } });

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect((init as RequestInit).method).toBe("PATCH");
    expect((init as RequestInit).body).toBe(JSON.stringify({ name: "updated" }));
  });

  it("DELETE returns void", async () => {
    globalThis.fetch = mockFetch({ status: 204, ok: true, json: async () => undefined }) as unknown as typeof fetch;
    const client = makeClient();

    const result = await client.delete("/items/1");

    expect(result).toBeUndefined();
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect((init as RequestInit).method).toBe("DELETE");
  });

  it("returns parsed JSON on success", async () => {
    const data = { id: 42, name: "widget" };
    globalThis.fetch = mockFetch({ json: async () => data }) as unknown as typeof fetch;
    const client = makeClient();

    const result = await client.get<typeof data>("/items/42");

    expect(result).toEqual(data);
  });

  it("returns undefined on 204 status", async () => {
    globalThis.fetch = mockFetch({ status: 204, ok: true }) as unknown as typeof fetch;
    const client = makeClient();

    const result = await client.get("/items/42");

    expect(result).toBeUndefined();
  });

  it("throws HttpError on non-ok response with status in message", async () => {
    globalThis.fetch = mockFetch({
      ok: false,
      status: 404,
      text: async () => "Not Found",
    }) as unknown as typeof fetch;
    const client = makeClient();

    await expect(client.get("/items/99")).rejects.toThrow(HttpError);
    await expect(client.get("/items/99")).rejects.toThrow("404");
  });

  it("sets AbortSignal on fetch call", async () => {
    globalThis.fetch = mockFetch() as unknown as typeof fetch;
    const client = makeClient();

    await client.get("/items");

    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    expect((init as RequestInit).signal).toBeDefined();
  });

  describe("HttpError", () => {
    it("stores status, body, method, path and has correct name", () => {
      const err = new HttpError(422, "Unprocessable Entity", "POST", "/items");

      expect(err.status).toBe(422);
      expect(err.body).toBe("Unprocessable Entity");
      expect(err.method).toBe("POST");
      expect(err.path).toBe("/items");
      expect(err.name).toBe("HttpError");
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toContain("422");
    });
  });
});
