import { describe, it, expect, beforeAll } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient } from "./helpers/mcp-test-client.js";

describe("Resource Integration Tests", () => {
  let client: Client;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
  });

  it("should list all resources including prompts", async () => {
    const result = await client.listResources();
    expect(result.resources.length).toBeGreaterThanOrEqual(4);

    const uris = result.resources.map((r) => r.uri);
    expect(uris).toContain("config://server/settings");
    expect(uris).toContain("api://mock/spec");
    expect(uris).toContain("prompt://templates/summarize-entity");
    expect(uris).toContain("prompt://templates/generate-report");
  });

  it("should read config resource with non-sensitive fields", async () => {
    const result = await client.readResource({ uri: "config://server/settings" });
    const content = result.contents[0];
    expect(content.mimeType).toBe("application/json");

    const text = "text" in content ? (content.text as string) : "";
    const data = JSON.parse(text) as Record<string, unknown>;
    expect(data).toHaveProperty("transport");
    expect(data).toHaveProperty("httpTimeoutMs");
    // Should NOT contain sensitive data
    expect(data).not.toHaveProperty("API_USERNAME");
    expect(data).not.toHaveProperty("API_PASSWORD");
  });

  it("should read API spec resource", async () => {
    const result = await client.readResource({ uri: "api://mock/spec" });
    const content = result.contents[0];
    const text = "text" in content ? (content.text as string) : "";
    const data = JSON.parse(text) as Record<string, unknown>;
    expect(data).toHaveProperty("name", "Mock REST API");
    expect(data).toHaveProperty("endpoints");
  });

  it("should read prompt template resource", async () => {
    const result = await client.readResource({
      uri: "prompt://templates/summarize-entity",
    });
    const content = result.contents[0];
    const text = "text" in content ? (content.text as string) : "";
    expect(content.mimeType).toBe("text/markdown");
    expect(text).toContain("summarize-entity");
    expect(text).toContain("{{entity_type}}");
  });

  it("should reject unknown resource URI", async () => {
    await expect(
      client.readResource({ uri: "unknown://foo/bar" }),
    ).rejects.toThrow();
  });
});
