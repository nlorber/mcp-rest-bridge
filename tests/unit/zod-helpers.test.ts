import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodToJsonSchema } from "../../src/utils/zod-helpers.js";

describe("zodToJsonSchema", () => {
  it("produces object type with empty properties for empty schema", () => {
    const schema = z.object({});
    const result = zodToJsonSchema(schema);
    expect(result.type).toBe("object");
    expect(result.properties).toEqual({});
    expect(result.required).toBeUndefined();
  });

  it("maps ZodString to string type", () => {
    const schema = z.object({ name: z.string() });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({ name: { type: "string" } });
  });

  it("maps ZodNumber to number type", () => {
    const schema = z.object({ price: z.number() });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({ price: { type: "number" } });
  });

  it("maps ZodBoolean to boolean type", () => {
    const schema = z.object({ active: z.boolean() });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({ active: { type: "boolean" } });
  });

  it("maps ZodEnum to string type with enum values", () => {
    const schema = z.object({ status: z.enum(["active", "inactive", "discontinued"]) });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({
      status: { type: "string", enum: ["active", "inactive", "discontinued"] },
    });
  });

  it("maps ZodArray to array type with item schema", () => {
    const schema = z.object({ tags: z.array(z.string()) });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({
      tags: { type: "array", items: { type: "string" } },
    });
  });

  it("unwraps ZodOptional and preserves the inner type", () => {
    const schema = z.object({ search: z.string().optional() });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({ search: { type: "string" } });
  });

  it("unwraps ZodDefault and includes the default value", () => {
    const schema = z.object({ page: z.number().default(1) });
    const result = zodToJsonSchema(schema);
    expect(result.properties).toMatchObject({ page: { type: "number", default: 1 } });
  });

  it("propagates description to the output", () => {
    const schema = z.object({
      id: z.number().int().positive().describe("The item ID"),
    });
    const result = zodToJsonSchema(schema);
    expect((result.properties as Record<string, { description?: string }>).id.description).toBe(
      "The item ID",
    );
  });

  it("propagates description through ZodOptional wrapper", () => {
    const schema = z.object({ note: z.string().optional().describe("Optional note") });
    const result = zodToJsonSchema(schema);
    expect(
      (result.properties as Record<string, { description?: string }>).note.description,
    ).toBe("Optional note");
  });

  it("marks required fields correctly and omits required for all-optional schema", () => {
    const schema = z.object({
      name: z.string(),
      note: z.string().optional(),
    });
    const result = zodToJsonSchema(schema);
    expect(result.required).toEqual(["name"]);
    expect(result.required).not.toContain("note");
  });

  it("omits required array when all fields are optional", () => {
    const schema = z.object({ a: z.string().optional(), b: z.number().optional() });
    const result = zodToJsonSchema(schema);
    expect(result.required).toBeUndefined();
  });

  it("falls back to string type for unrecognised Zod types", () => {
    // z.literal is not explicitly handled — should fall through to string
    const schema = z.object({ flag: z.literal("yes") });
    const result = zodToJsonSchema(schema);
    expect((result.properties as Record<string, { type: string }>).flag.type).toBe("string");
  });
});
