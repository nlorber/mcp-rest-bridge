import { describe, it, expect, beforeAll } from "vitest";
import { McpError, ErrorCode } from "@modelcontextprotocol/sdk/types.js";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "./helpers/mcp-test-client.js";

describe("Tool Input Validation", () => {
  let client: Client;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
  });

  it("rejects missing required fields with MCP InvalidRequest error", async () => {
    // create_item requires: name (string), category_id (number), price (number)
    const error = await client
      .callTool({ name: "create_item", arguments: {} })
      .catch((e) => e);

    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.InvalidRequest); // ErrorCode.InvalidRequest
    expect(error.message).toContain("Invalid input for tool 'create_item'");
    expect(error.message).toContain("name");
  });

  it("rejects wrong types with MCP InvalidRequest error", async () => {
    // id must be a positive integer, not a string
    const error = await client
      .callTool({ name: "get_item", arguments: { id: "not-a-number" } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.InvalidRequest);
    expect(error.message).toContain("Invalid input for tool 'get_item'");
  });

  it("rejects out-of-range values with MCP InvalidRequest error", async () => {
    // id must be positive — 0 and negative are invalid
    const error = await client
      .callTool({ name: "get_item", arguments: { id: -1 } })
      .catch((e) => e);

    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.InvalidRequest);
    expect(error.message).toContain("Invalid input for tool 'get_item'");
  });

  it("returns unknown-tool error for non-existent tools", async () => {
    const error = await client
      .callTool({ name: "nonexistent_tool", arguments: {} })
      .catch((e) => e);

    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.InvalidRequest);
    expect(error.message).toContain("Unknown tool");
  });
});
