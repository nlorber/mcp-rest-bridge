import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { filteredToolResponse } from "../../protocol/tools/response.js";
import { createFilter } from "../../api/filters/definitions.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({
  id: z.number().int().positive().describe("The category ID to retrieve"),
});

/**
 * Create the get_category tool definition.
 */
export function getCategoryTool(httpClient: HttpClient): ToolDefinition {
  const filter = createFilter("category:detail");

  return {
    tool: {
      name: "get_category",
      description: "Get detailed information about a specific category by its ID.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async (args) => {
      const input = inputSchema.parse(args);
      try {
        const data = await httpClient.get<Record<string, unknown>>(`/categories/${input.id}`);
        return filteredToolResponse(data, filter);
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
