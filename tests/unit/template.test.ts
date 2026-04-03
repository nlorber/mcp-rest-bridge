import { describe, it, expect } from "vitest";
import {
  fillTemplate,
  validateRequiredVariables,
  extractVariableNames,
} from "../../src/protocol/prompts/template.js";

describe("fillTemplate", () => {
  it("should substitute simple variables", () => {
    const result = fillTemplate("Hello {{name}}, welcome to {{place}}!", {
      name: "Alice",
      place: "Wonderland",
    });
    expect(result).toBe("Hello Alice, welcome to Wonderland!");
  });

  it("should replace missing variables with empty string", () => {
    const result = fillTemplate("Hello {{name}}!", {});
    expect(result).toBe("Hello !");
  });

  it("should process conditional blocks when variable is present", () => {
    const template = "Start{{#if extra}} — {{extra}} included{{/if}} End";
    const result = fillTemplate(template, { extra: "bonus" });
    expect(result).toBe("Start — bonus included End");
  });

  it("should remove conditional blocks when variable is absent", () => {
    const template = "Start{{#if extra}} — extra included{{/if}} End";
    const result = fillTemplate(template, {});
    expect(result).toBe("Start End");
  });

  it("should remove conditional blocks when variable is empty", () => {
    const template = "Start{{#if extra}} — extra included{{/if}} End";
    const result = fillTemplate(template, { extra: "  " });
    expect(result).toBe("Start End");
  });

  it("should collapse multiple blank lines", () => {
    const result = fillTemplate("Line 1\n\n\n\n\nLine 2", {});
    expect(result).toBe("Line 1\n\nLine 2");
  });

  it("should trim leading/trailing whitespace", () => {
    const result = fillTemplate("  Hello {{name}}  ", { name: "World" });
    expect(result).toBe("Hello World");
  });
});

describe("validateRequiredVariables", () => {
  it("should pass when all required variables are present", () => {
    const result = validateRequiredVariables({ name: "Alice", age: "30" }, ["name", "age"]);
    expect(result.valid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("should fail when a required variable is missing", () => {
    const result = validateRequiredVariables({ name: "Alice" }, ["name", "age"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["age"]);
  });

  it("should fail when a required variable is empty", () => {
    const result = validateRequiredVariables({ name: "" }, ["name"]);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(["name"]);
  });

  it("should pass with no required variables", () => {
    const result = validateRequiredVariables({}, []);
    expect(result.valid).toBe(true);
  });
});

describe("extractVariableNames", () => {
  it("should extract simple variables", () => {
    const names = extractVariableNames("{{foo}} and {{bar}}");
    expect(names).toContain("foo");
    expect(names).toContain("bar");
  });

  it("should extract conditional variables", () => {
    const names = extractVariableNames("{{#if show}}content{{/if}}");
    expect(names).toContain("show");
  });

  it("should deduplicate", () => {
    const names = extractVariableNames("{{name}} is {{name}}");
    expect(names.filter((n) => n === "name")).toHaveLength(1);
  });
});
