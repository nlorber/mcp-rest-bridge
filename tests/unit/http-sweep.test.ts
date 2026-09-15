import { describe, expect, it, vi } from "vitest";

import { Logger } from "../../src/logger.js";
import { sweepIdleSessions } from "../../src/transport/http.js";

const logger = new Logger("error");

function entry(lastActivity: number) {
  return { lastActivity, transport: { close: vi.fn(() => Promise.resolve()) } };
}

describe("sweepIdleSessions", () => {
  it("evicts and closes only sessions idle longer than the timeout", () => {
    const stale = entry(0); // idle 20_000ms
    const fresh = entry(18_000); // idle 2_000ms
    const sessions = new Map([
      ["stale", stale],
      ["fresh", fresh],
    ]);

    sweepIdleSessions(sessions, 20_000, 5_000, logger);

    expect([...sessions.keys()]).toEqual(["fresh"]);
    expect(stale.transport.close).toHaveBeenCalledOnce();
    expect(fresh.transport.close).not.toHaveBeenCalled();
  });

  it("keeps every session when none exceed the timeout", () => {
    const sessions = new Map([
      ["a", entry(9_000)],
      ["b", entry(10_000)],
    ]);

    sweepIdleSessions(sessions, 11_000, 5_000, logger);

    expect(sessions.size).toBe(2);
  });
});
