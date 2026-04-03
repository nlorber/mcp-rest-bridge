import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { filteredToolResponse } from "../../protocol/tools/response.js";
import { createFilter } from "../../api/filters/definitions.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({
  id: z.number().int().positive().describe("The item ID to update"),
  name: z.string().optional().describe("New name"),
  description: z.string().optional().describe("New description"),
  category_id: z.number().int().positive().optional().describe("New category ID"),
  price: z.number().positive().optional().describe("New price"),
  stock: z.number().int().min(0).optional().describe("New stock quantity"),
  status: z
    .enum(["active", "inactive", "discontinued"])
    .optional()
    .describe("New status"),
});

/**
 * Create the update_item tool definition.
 */
export function updateItemTool(httpClient: HttpClient): ToolDefinition {
  const filter = createFilter("item:detail");

  return {
    tool: {
      name: "update_item",
      description:
        "Update an existing item. Only provided fields will be changed.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async (args) => {
      const input = inputSchema.parse(args);
      const { id, ...updates } = input;
      try {
        const data = await httpClient.patch<Record<string, unknown>>(`/items/${id}`, {
          body: updates,
        });
        return filteredToolResponse(data, filter);
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
