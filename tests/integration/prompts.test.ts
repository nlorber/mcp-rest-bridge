import { describe, it, expect, beforeAll } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "./helpers/mcp-test-client.js";

describe("Prompt Integration Tests", () => {
  let client: Client;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
  });

  it("should list all prompts", async () => {
    const result = await client.listPrompts();
    expect(result.prompts.length).toBeGreaterThanOrEqual(2);

    const names = result.prompts.map((p) => p.name);
    expect(names).toContain("summarize-entity");
    expect(names).toContain("generate-report");
  });

  it("should get summarize-entity prompt with variables substituted", async () => {
    const result = await client.getPrompt({
      name: "summarize-entity",
      arguments: { entity_type: "item", entity_id: "42" },
    });

    expect(result.messages).toHaveLength(1);
    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("item");
    expect(text).toContain("42");
    expect(text).not.toContain("{{entity_type}}");
    expect(text).not.toContain("{{entity_id}}");
  });

  it("should get generate-report prompt with optional format", async () => {
    const result = await client.getPrompt({
      name: "generate-report",
      arguments: { report_type: "low-stock", format: "markdown" },
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("low-stock");
    expect(text).toContain("markdown");
  });

  it("should get generate-report prompt without optional format", async () => {
    const result = await client.getPrompt({
      name: "generate-report",
      arguments: { report_type: "inventory-summary" },
    });

    const text = (result.messages[0].content as { type: string; text: string }).text;
    expect(text).toContain("inventory-summary");
    // Conditional block should be removed
    expect(text).not.toContain("{{format}}");
  });

  it("should reject missing required arguments", async () => {
    await expect(
      client.getPrompt({ name: "summarize-entity", arguments: {} }),
    ).rejects.toThrow();
  });

  it("should reject unknown prompt", async () => {
    await expect(
      client.getPrompt({ name: "nonexistent-prompt", arguments: {} }),
    ).rejects.toThrow();
  });
});
