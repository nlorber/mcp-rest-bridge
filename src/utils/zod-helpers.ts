import type { z } from "zod";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Convert a Zod schema to a JSON Schema object suitable for MCP tool inputSchema.
 * Uses Zod's built-in .describe() for field descriptions and handles common types.
 */
export function zodToJsonSchema(schema: z.ZodObject<z.ZodRawShape>): Tool["inputSchema"] {
  const shape = schema.shape;
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as z.ZodTypeAny;
    properties[key] = zodFieldToJsonSchema(zodType);

    if (!zodType.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: "object" as const,
    properties,
    ...(required.length > 0 && { required }),
  };
}

function zodFieldToJsonSchema(field: z.ZodTypeAny): Record<string, unknown> {
  const description = field.description;
  const def = field._def;

  // Unwrap optional
  if (def.typeName === "ZodOptional") {
    const inner = zodFieldToJsonSchema(def.innerType as z.ZodTypeAny);
    if (description) inner.description = description;
    return inner;
  }

  // Unwrap default
  if (def.typeName === "ZodDefault") {
    const inner = zodFieldToJsonSchema(def.innerType as z.ZodTypeAny);
    if (description) inner.description = description;
    if (def.defaultValue !== undefined) {
      inner.default = typeof def.defaultValue === "function" ? def.defaultValue() : def.defaultValue;
    }
    return inner;
  }

  const result: Record<string, unknown> = {};
  if (description) result.description = description;

  switch (def.typeName) {
    case "ZodString":
      result.type = "string";
      break;
    case "ZodNumber":
      result.type = "number";
      break;
    case "ZodBoolean":
      result.type = "boolean";
      break;
    case "ZodEnum":
      result.type = "string";
      result.enum = def.values;
      break;
    case "ZodArray":
      result.type = "array";
      result.items = zodFieldToJsonSchema(def.type as z.ZodTypeAny);
      break;
    default:
      console.warn(`[zod-helpers] Unrecognized Zod type "${def.typeName}", falling back to string`);
      result.type = "string";
  }

  return result;
}
