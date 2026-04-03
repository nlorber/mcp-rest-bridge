import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { toolResponse } from "../../protocol/tools/response.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({
  id: z.number().int().positive().describe("The item ID to delete"),
});

/**
 * Create the delete_item tool definition.
 */
export function deleteItemTool(httpClient: HttpClient): ToolDefinition {
  return {
    tool: {
      name: "delete_item",
      description: "Delete an item by its ID. This action is irreversible.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async (args) => {
      const input = inputSchema.parse(args);
      try {
        await httpClient.delete(`/items/${input.id}`);
        return toolResponse({ success: true, deleted_id: input.id });
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
