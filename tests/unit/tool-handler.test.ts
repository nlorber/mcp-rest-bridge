import { describe, it, expect } from "vitest";
import { McpError, ErrorCode, type CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createCallToolHandler } from "../../src/protocol/tools/handler.js";
import { ToolRegistry, type ToolDefinition } from "../../src/protocol/tools/registry.js";
import { ToolError } from "../../src/utils/mcp-error.js";
import { Logger } from "../../src/logger.js";

const logger = new Logger("error");

/** A registry holding one tool, plus a dispatcher over it. */
function dispatcherFor(handler: ToolDefinition["handler"], timeoutMs = 1000) {
  const registry = new ToolRegistry();
  registry.register({ tool: { name: "test_tool", inputSchema: { type: "object" } }, handler });
  return createCallToolHandler(registry, timeoutMs, logger);
}

function callTool(
  dispatch: ReturnType<typeof createCallToolHandler>,
  name = "test_tool",
): Promise<CallToolResult> {
  return dispatch({ method: "tools/call", params: { name, arguments: {} } });
}

function resultText(result: CallToolResult): string {
  return (result.content[0] as { text: string }).text;
}

describe("createCallToolHandler error handling", () => {
  it("returns a ToolError as an isError result carrying its message", async () => {
    const dispatch = dispatcherFor(() =>
      Promise.reject(new ToolError("Rate limited — please try again later")),
    );

    const result = await callTool(dispatch);

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' failed: Rate limited — please try again later");
  });

  it("hides the message of an unexpected error behind a generic isError result", async () => {
    const dispatch = dispatcherFor(() => Promise.reject(new Error("secret upstream detail")));

    const result = await callTool(dispatch);

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' failed due to an internal error");
  });

  it("returns a timeout as an isError result", async () => {
    const dispatch = dispatcherFor(() => new Promise<never>(() => {}), 20);

    const result = await callTool(dispatch);

    expect(result.isError).toBe(true);
    expect(resultText(result)).toBe("Tool 'test_tool' timed out after 20ms");
  });

  it("throws InvalidParams when arguments fail the tool's schema", async () => {
    const dispatch = dispatcherFor((args) => {
      z.object({ id: z.number() }).parse(args);
      return Promise.resolve({ content: [] });
    });

    const error = await callTool(dispatch).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
  });

  it("throws InvalidParams for an unknown tool", async () => {
    const dispatch = dispatcherFor(() => Promise.resolve({ content: [] }));

    const error = await callTool(dispatch, "missing_tool").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(McpError);
    expect((error as McpError).code).toBe(ErrorCode.InvalidParams);
    expect((error as McpError).message).toContain("Unknown tool: missing_tool");
  });
});

describe("ToolRegistry", () => {
  it("keeps each server's tools separate", () => {
    const first = new ToolRegistry();
    const second = new ToolRegistry();
    const handler: ToolDefinition["handler"] = () => Promise.resolve({ content: [] });

    first.register({ tool: { name: "only_in_first", inputSchema: { type: "object" } }, handler });

    expect(first.list().map((t) => t.name)).toEqual(["only_in_first"]);
    expect(second.list()).toEqual([]);
    expect(second.getHandler("only_in_first")).toBeUndefined();
  });
});
