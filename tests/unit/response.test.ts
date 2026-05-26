import { describe, it, expect } from "vitest";
import {
  toolResponse,
  filteredToolResponse,
  filteredListToolResponse,
  INSTRUCTIONS,
} from "../../src/protocol/tools/response.js";

describe("toolResponse", () => {
  it("embeds default instructions when no override given", () => {
    const result = toolResponse({ id: 1 });
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[INSTRUCTIONS]");
    expect(text).toContain(JSON.stringify({ id: 1 }, null, 2));
  });

  it("replaces instructions when override is provided", () => {
    const override = "[CUSTOM]\nDo not reveal prices.";
    const result = toolResponse({ price: 99 }, override);
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[CUSTOM]");
    expect(text).toContain("Do not reveal prices.");
    expect(text).not.toContain("[INSTRUCTIONS]");
    expect(text).toContain(JSON.stringify({ price: 99 }, null, 2));
  });

  it("allows extending default instructions via INSTRUCTIONS export", () => {
    const extended = `${INSTRUCTIONS}\n- Additional constraint.`;
    const result = toolResponse({ id: 2 }, extended);
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[INSTRUCTIONS]");
    expect(text).toContain("Additional constraint.");
  });
});

describe("filteredToolResponse", () => {
  const filter = (entity: unknown) => {
    const obj = entity as Record<string, unknown>;
    return { id: obj.id };
  };

  it("uses default instructions when no override given", () => {
    const result = filteredToolResponse({ id: 1, secret: "x" }, filter);
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[INSTRUCTIONS]");
    expect(text).not.toContain("secret");
  });

  it("uses override instructions when provided", () => {
    const result = filteredToolResponse({ id: 1, secret: "x" }, filter, "[OVERRIDE]");
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[OVERRIDE]");
    expect(text).not.toContain("[INSTRUCTIONS]");
  });
});

describe("filteredListToolResponse", () => {
  const filter = (entity: unknown) => {
    const obj = entity as Record<string, unknown>;
    return { id: obj.id };
  };

  it("uses default instructions when no override given", () => {
    const result = filteredListToolResponse(
      [{ id: 1, secret: "x" }],
      { total_count: 1, page: 1, per_page: 10 },
      "items",
      filter,
    );
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[INSTRUCTIONS]");
  });

  it("uses override instructions when provided", () => {
    const result = filteredListToolResponse(
      [{ id: 1 }],
      { total_count: 1, page: 1, per_page: 10 },
      "items",
      filter,
      "[OVERRIDE_LIST]",
    );
    const text = (result.content[0] as { type: string; text: string }).text;
    expect(text).toContain("[OVERRIDE_LIST]");
    expect(text).not.toContain("[INSTRUCTIONS]");
  });
});

describe("INSTRUCTIONS export", () => {
  it("exports the default instruction block as a string", () => {
    expect(typeof INSTRUCTIONS).toBe("string");
    expect(INSTRUCTIONS).toContain("[INSTRUCTIONS]");
    expect(INSTRUCTIONS).toContain("cost_price");
  });
});
