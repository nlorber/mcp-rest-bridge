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
});
