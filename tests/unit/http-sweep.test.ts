import { describe, expect, it } from "vitest";

import { Logger } from "../../src/logger.js";
import { sweepIdleSessions } from "../../src/transport/http.js";

const logger = new Logger("error");

describe("sweepIdleSessions", () => {
  it("evicts only sessions idle longer than the timeout", () => {
    const sessions = new Map<string, { lastActivity: number }>([
      ["stale", { lastActivity: 0 }], // idle 20_000ms
      ["fresh", { lastActivity: 18_000 }], // idle 2_000ms
    ]);

    sweepIdleSessions(sessions, 20_000, 5_000, logger);

    expect([...sessions.keys()]).toEqual(["fresh"]);
  });

  it("keeps every session when none exceed the timeout", () => {
    const sessions = new Map<string, { lastActivity: number }>([
      ["a", { lastActivity: 9_000 }],
      ["b", { lastActivity: 10_000 }],
    ]);

    sweepIdleSessions(sessions, 11_000, 5_000, logger);

    expect(sessions.size).toBe(2);
  });
});
