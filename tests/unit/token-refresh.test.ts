import { afterEach, describe, expect, it, vi } from "vitest";

import { TokenManager } from "../../src/api/auth/token-manager.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");

function tokenResponse(token: string, expiresIn: number) {
  return {
    ok: true,
    json: async () => ({ access_token: token, token_type: "bearer", expires_in: expiresIn }),
  };
}

describe("TokenManager auto-refresh", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("serves from cache, then refetches once inside the 5-minute refresh buffer", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"));

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse("first.jwt", 3600))
      .mockResolvedValueOnce(tokenResponse("second.jwt", 3600));
    vi.stubGlobal("fetch", fetchMock);

    const tm = new TokenManager(
      "http://localhost:3100",
      { username: "admin", password: "pw" },
      logger,
    );

    expect(await tm.getToken()).toBe("first.jwt");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // +1800s: well before the 3300s buffer threshold (expiry 3600 - 300) → cached.
    vi.setSystemTime(new Date("2025-01-01T00:30:00Z"));
    expect(await tm.getToken()).toBe("first.jwt");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // +3400s: within 5 min of expiry → auto-refresh fires a second fetch.
    vi.setSystemTime(new Date("2025-01-01T00:56:40Z"));
    expect(await tm.getToken()).toBe("second.jwt");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
