import { describe, it, expect, afterEach } from "vitest";
import { McpError, ErrorCode, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createCallToolHandler } from "../../src/protocol/tools/handler.js";
import { registerTool, clearTools, type ToolDefinition } from "../../src/protocol/tools/registry.js";
import { ToolError } from "../../src/utils/mcp-error.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");

function registerTestTool(handler: ToolDefinition["handler"]): void {
  registerTool({ tool: { name: "test_tool", inputSchema: { type: "object" } }, handler });
}

function callTestTool(name = "test_tool", timeoutMs = 1000): Promise<CallToolResult> {
  return createCallToolHandler(timeoutMs, logger)({
    method: "tools/call",
    params: { name, arguments: {} },
  });
}

function resultText(result: CallToolResult): string {
  return (result.content[0] as { text: string }).text;
}

afterEach(() => {
  clearTools();
});

describe("createCallToolHandler error handling", () => {
  it("returns a ToolError as an isError result carrying its message", async () => {
    registerTestTool(() => Promise.reject(new ToolError("Rate limited — please try again later")));

    const result = await callTestTool();

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' failed: Rate limited — please try again later");
  });

  it("hides the message of an unexpected error behind a generic isError result", async () => {
    registerTestTool(() => Promise.reject(new Error("secret upstream detail")));

    const result = await callTestTool();

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' failed due to an internal error");
  });

  it("returns a timeout as an isError result", async () => {
    registerTestTool(() => new Promise<never>(() => {}));

    const result = await callTestTool("test_tool", 20);

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' timed out after 20ms");
  });

  it("throws InvalidParams when arguments fail the tool's schema", async () => {
    registerTestTool((args) => {
      z.object({ id: z.number() }).parse(args);
      return Promise.resolve({ content: [] });
    });

    const error = await callTestTool().catch((e: unknown) => e);

    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
  });

  it("throws InvalidParams for an unknown tool", async () => {
    const error = await callTestTool("missing_tool").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
    expect((error as McpError).message).toContain("Unknown tool: missing_tool");
  });
});
