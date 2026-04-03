import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { filteredToolResponse } from "../../protocol/tools/response.js";
import { createFilter } from "../../api/filters/definitions.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({
  name: z.string().describe("Name of the item"),
  description: z.string().optional().describe("Item description"),
  category_id: z.number().int().positive().describe("Category ID for the item"),
  price: z.number().positive().describe("Item price"),
  stock: z.number().int().min(0).optional().describe("Initial stock quantity (default: 0)"),
  status: z
    .enum(["active", "inactive", "discontinued"])
    .optional()
    .describe("Item status (default: active)"),
});

/**
 * Create the create_item tool definition.
 */
export function createItemTool(httpClient: HttpClient): ToolDefinition {
  const filter = createFilter("item:detail");

  return {
    tool: {
      name: "create_item",
      description:
        "Create a new item. Requires name, category_id, and price at minimum.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async (args) => {
      const input = inputSchema.parse(args);
      try {
        const data = await httpClient.post<Record<string, unknown>>("/items", {
          body: input,
        });
        return filteredToolResponse(data, filter);
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
