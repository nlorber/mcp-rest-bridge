import { describe, it, expect, afterEach } from "vitest";
import { loadPromptFile, clearPromptCache } from "../../src/protocol/prompts/loader.js";

afterEach(() => {
  clearPromptCache();
});

describe("loadPromptFile — path traversal protection", () => {
  it("rejects paths with .. (directory traversal)", async () => {
    await expect(loadPromptFile("../package.json")).rejects.toThrow(
      /path traversal/i,
    );
  });

  it("rejects paths with nested .. segments", async () => {
    await expect(loadPromptFile("../../src/config.ts")).rejects.toThrow(
      /path traversal/i,
    );
  });

  it("rejects absolute paths", async () => {
    await expect(loadPromptFile("/etc/passwd")).rejects.toThrow(
      /absolute paths/i,
    );
  });

  it("rejects absolute paths on the current working directory", async () => {
    const absPath = process.cwd() + "/package.json";
    await expect(loadPromptFile(absPath)).rejects.toThrow(/path traversal|absolute/i);
  });

  it("accepts a valid relative filename within the prompts directory", async () => {
    const content = await loadPromptFile("summarize-entity.md");
    expect(typeof content).toBe("string");
    expect(content.length).toBeGreaterThan(0);
  });
});
