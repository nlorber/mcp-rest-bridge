import { describe, it, expect } from "vitest";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import { HttpError } from "../../src/api/client.js";
import { mapApiError } from "../../src/api/errors.js";

function expectMcpError(fn: () => void, code: ErrorCode, messagePattern: string) {
  try {
    fn();
    expect.fail("Expected function to throw");
  } catch (error) {
    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(code);
    expect((error as McpError).message).toContain(messagePattern);
  }
}

describe("mapApiError", () => {
  it("maps HttpError 400 to InvalidRequest with body", () => {
    expectMcpError(
      () => mapApiError(new HttpError(400, "invalid input", "POST", "/items")),
      ErrorCode.InvalidRequest,
      "Bad request: invalid input",
    );
  });

  it("maps HttpError 401 to InvalidRequest with auth message", () => {
    expectMcpError(
      () => mapApiError(new HttpError(401, "unauthorized", "GET", "/me")),
      ErrorCode.InvalidRequest,
      "Authentication failed",
    );
  });

  it("maps HttpError 403 to InvalidRequest with permissions message", () => {
    expectMcpError(
      () => mapApiError(new HttpError(403, "forbidden", "DELETE", "/resource")),
      ErrorCode.InvalidRequest,
      "Access denied",
    );
  });

  it("maps HttpError 404 to InvalidRequest with method and path", () => {
    expectMcpError(
      () => mapApiError(new HttpError(404, "not found", "GET", "/widgets/99")),
      ErrorCode.InvalidRequest,
      "Not found: GET /widgets/99",
    );
  });

  it("maps HttpError 409 to InvalidRequest with body", () => {
    expectMcpError(
      () => mapApiError(new HttpError(409, "duplicate key", "POST", "/items")),
      ErrorCode.InvalidRequest,
      "Conflict: duplicate key",
    );
  });

  it("maps HttpError 429 to InvalidRequest with rate limit message", () => {
    expectMcpError(
      () => mapApiError(new HttpError(429, "too many requests", "GET", "/data")),
      ErrorCode.InvalidRequest,
      "Rate limited",
    );
  });

  it("maps HttpError 500 to InternalError with status and body", () => {
    expectMcpError(
      () => mapApiError(new HttpError(500, "internal server error", "GET", "/data")),
      ErrorCode.InternalError,
      "API server error (500): internal server error",
    );
  });

  it("maps HttpError 503 to InternalError with status and body", () => {
    expectMcpError(
      () => mapApiError(new HttpError(503, "service unavailable", "GET", "/health")),
      ErrorCode.InternalError,
      "API server error (503): service unavailable",
    );
  });

  it("maps unknown 4xx HttpError (418) to InvalidRequest with status and body", () => {
    expectMcpError(
      () => mapApiError(new HttpError(418, "I'm a teapot", "BREW", "/coffee")),
      ErrorCode.InvalidRequest,
      "API error (418): I'm a teapot",
    );
  });

  it("maps plain Error to InternalError with message", () => {
    expectMcpError(
      () => mapApiError(new Error("network timeout")),
      ErrorCode.InternalError,
      "API request failed: network timeout",
    );
  });

  it("maps non-Error string value to InternalError with string representation", () => {
    expectMcpError(
      () => mapApiError("something went wrong"),
      ErrorCode.InternalError,
      "API request failed: something went wrong",
    );
  });
});
