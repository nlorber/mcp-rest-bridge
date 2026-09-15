import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpClient } from "../../src/api/client.js";
import type { TokenManager } from "../../src/api/auth/token-manager.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");
const tokenManager = {
  getToken: vi.fn().mockResolvedValue("test-token"),
} as unknown as TokenManager;

function okResponse() {
  return { ok: true, status: 200, json: async () => ({ result: "ok" }), text: async () => "" };
}

function makeClient() {
  return new HttpClient("http://localhost:3000", tokenManager, 5000, logger);
}

describe("HttpClient resilience", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("retries after a network error, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeClient().get("/items")).resolves.toEqual({ result: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries on a 5xx response, then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}), text: async () => "busy" })
      .mockResolvedValueOnce(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeClient().get("/items")).resolves.toEqual({ result: "ok" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("composes a caller-supplied signal with the timeout via AbortSignal.any", async () => {
    const anySpy = vi.spyOn(AbortSignal, "any");
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const ac = new AbortController();
    await makeClient().get("/items", { signal: ac.signal });

    expect(anySpy).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("does not retry a POST after a network error, so a create is never duplicated", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("socket hang up"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeClient().post("/items", { body: { name: "widget" } })).rejects.toThrow("socket hang up");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["patch", "delete"] as const)("does not retry %s on a 5xx response", async (method) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({}), text: async () => "bad gateway" });
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeClient()[method]("/items/1")).rejects.toThrow("HTTP 502");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry once the caller's signal has aborted", async () => {
    const ac = new AbortController();
    const fetchMock = vi.fn().mockImplementation(() => {
      ac.abort();
      return Promise.reject(new DOMException("This operation was aborted", "AbortError"));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(makeClient().get("/items", { signal: ac.signal })).rejects.toThrow("aborted");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
