import { describe, it, expect } from "vitest";
import { pickFields } from "../../src/api/filters/field-filter.js";
import { createFilter, getFilterFields } from "../../src/api/filters/definitions.js";


describe("pickFields", () => {
  it("should pick only allowed top-level fields", () => {
    const obj = { id: 1, name: "Test", secret: "hidden", internal_code: "SKU-1" };
    const result = pickFields(obj, ["id", "name"]);
    expect(result).toEqual({ id: 1, name: "Test" });
    expect(result).not.toHaveProperty("secret");
    expect(result).not.toHaveProperty("internal_code");
  });

  it("should handle nested fields with dot notation", () => {
    const obj = { id: 1, address: { city: "Paris", zip: "75001", internal: "x" } };
    const result = pickFields(obj, ["id", "address.city"]);
    expect(result).toEqual({ id: 1, address: { city: "Paris" } });
  });

  it("should skip missing fields silently", () => {
    const obj = { id: 1 };
    const result = pickFields(obj, ["id", "name", "nonexistent"]);
    expect(result).toEqual({ id: 1 });
  });

  it("should handle null nested objects", () => {
    const obj = { id: 1, address: null };
    const result = pickFields(obj, ["id", "address.city"]);
    expect(result).toEqual({ id: 1 });
  });

  // --- Hardened input handling ---

  it("returns {} for null input (safe-by-default)", () => {
    expect(pickFields(null, ["id", "name"])).toEqual({});
  });

  it("returns {} for primitive string input", () => {
    expect(pickFields("some-string", ["id"])).toEqual({});
  });

  it("returns {} for numeric primitive input", () => {
    expect(pickFields(42, ["id"])).toEqual({});
  });

  it("returns {} for boolean primitive input", () => {
    expect(pickFields(true, ["id"])).toEqual({});
  });

  it("recurses over array of objects, filtering each element", () => {
    const arr = [
      { id: 1, name: "A", cost_price: 99 },
      { id: 2, name: "B", cost_price: 50 },
    ];
    const result = pickFields(arr, ["id", "name"]);
    expect(result).toEqual([
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ]);
  });

  it("drops non-object elements when input is an array of primitives", () => {
    const result = pickFields(["hello", "world"], ["id"]);
    expect(result).toEqual([]);
  });

  it("drops null elements when input is an array of nulls", () => {
    const result = pickFields([null, null], ["id"]);
    expect(result).toEqual([]);
  });

  it("recurses into nested arrays of objects and strips trap fields", () => {
    const arr = [{ id: 1, cost_price: 42, name: "Widget" }];
    const result = pickFields(arr, ["id", "name"]);
    expect(result).toEqual([{ id: 1, name: "Widget" }]);
    // Array result must not contain cost_price
    const asArr = result as Record<string, unknown>[];
    expect(asArr[0]).not.toHaveProperty("cost_price");
  });

  it("skips nested array values for dot-notation fields (safe-by-default)", () => {
    // A field whose nested value is itself an array — should be skipped, not leaked
    const obj = { id: 1, tags: [{ secret: "x" }] };
    const result = pickFields(obj, ["id", "tags.secret"]);
    expect(result).toEqual({ id: 1 });
  });
});

describe("item field definitions", () => {
  const itemWithTraps = {
    id: 1,
    name: "Keyboard",
    description: "A keyboard",
    category_id: 1,
    price: 79.99,
    stock: 150,
    status: "active",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-03-01T14:30:00Z",
    internal_code: "SKU-KB-7842",
    supplier_id: 4012,
    cost_price: 32.5,
    margin_pct: 59.4,
  };

  it("item:list should strip trap fields", () => {
    const filter = createFilter("item:list");
    const result = filter(itemWithTraps);
    expect(result).not.toHaveProperty("internal_code");
    expect(result).not.toHaveProperty("supplier_id");
    expect(result).not.toHaveProperty("cost_price");
    expect(result).not.toHaveProperty("margin_pct");
    expect(result).not.toHaveProperty("description");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("price");
  });

  it("item:detail should include description but strip trap fields", () => {
    const filter = createFilter("item:detail");
    const result = filter(itemWithTraps);
    expect(result).not.toHaveProperty("internal_code");
    expect(result).not.toHaveProperty("supplier_id");
    expect(result).not.toHaveProperty("cost_price");
    expect(result).not.toHaveProperty("margin_pct");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("created_at");
  });

  it("item:list fields should be a subset of item:detail fields", () => {
    const listFields = getFilterFields("item:list");
    const detailFields = getFilterFields("item:detail");
    for (const field of listFields) {
      expect(detailFields).toContain(field);
    }
  });
});

describe("category field definitions", () => {
  it("category:list should strip internal_code and sort_order", () => {
    const category = {
      id: 1,
      name: "Electronics",
      description: "Electronic devices",
      item_count: 3,
      internal_code: "CAT-ELEC-001",
      sort_order: 10,
    };
    const filter = createFilter("category:list");
    const result = filter(category);
    expect(result).not.toHaveProperty("internal_code");
    expect(result).not.toHaveProperty("sort_order");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("item_count");
  });
});
