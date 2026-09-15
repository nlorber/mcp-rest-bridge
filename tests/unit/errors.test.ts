import { describe, it, expect } from "vitest";
import { HttpError } from "../../src/api/client.js";
import { mapApiError } from "../../src/api/errors.js";
import { ToolError } from "../../src/utils/mcp-error.js";

const SECRET_BODY = "internal stack trace at db.internal:5432";

function thrownBy(fn: () => void): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return expect.fail("Expected function to throw");
}

describe("mapApiError", () => {
  it.each([
    [400, "POST", "/items", "Bad request: the API rejected the input"],
    [401, "GET", "/me", "Authentication failed"],
    [403, "DELETE", "/resource", "Access denied"],
    [404, "GET", "/widgets/99", "Not found: GET /widgets/99"],
    [409, "POST", "/items", "Conflict:"],
    [429, "GET", "/data", "Rate limited"],
    [500, "GET", "/data", "API server error (500)"],
    [503, "GET", "/health", "API server error (503)"],
    [418, "BREW", "/coffee", "API error (418)"],
  ])("maps HttpError %i to a ToolError without the upstream body", (status, method, path, expected) => {
    const error = thrownBy(() => mapApiError(new HttpError(status, SECRET_BODY, method, path)));

    expect(error).toBeInstanceOf(ToolError);
    expect((error as ToolError).message).toContain(expected);
    expect((error as ToolError).message).not.toContain(SECRET_BODY);
  });

  it("maps a fetch timeout to a ToolError", () => {
    const error = thrownBy(() =>
      mapApiError(new DOMException("The operation was aborted due to timeout", "TimeoutError")),
    );

    expect(error).toBeInstanceOf(ToolError);
    expect((error as ToolError).message).toBe("API request timed out");
  });

  it("rethrows unrecognized errors unchanged", () => {
    const original = new SyntaxError(`Unexpected token '<', "${SECRET_BODY}" is not valid JSON`);
    expect(thrownBy(() => mapApiError(original))).toBe(original);
    expect(thrownBy(() => mapApiError("something went wrong"))).toBe("something went wrong");
  });
});

describe("HttpError", () => {
  it("keeps the body out of its message", () => {
    const error = new HttpError(500, SECRET_BODY, "GET", "/items");
    expect(error.message).toBe("HTTP 500 GET /items");
    expect(error.body).toBe(SECRET_BODY);
  });
});
