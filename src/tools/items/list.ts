import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { filteredListToolResponse } from "../../protocol/tools/response.js";
import { createFilter } from "../../api/filters/definitions.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({
  page: z.number().int().positive().optional().describe("Page number (default: 1)"),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Items per page (default: 10, max: 100)"),
  search: z.string().optional().describe("Search term to filter by name or description"),
  category_id: z.number().int().optional().describe("Filter by category ID"),
  status: z
    .enum(["active", "inactive", "discontinued"])
    .optional()
    .describe("Filter by status"),
});

/**
 * Create the list_items tool definition.
 */
export function listItemsTool(httpClient: HttpClient): ToolDefinition {
  const filter = createFilter("item:list");

  return {
    tool: {
      name: "list_items",
      description:
        "List items with pagination, search, and filtering. " +
        "Returns a paginated list of items with their key attributes.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async (args) => {
      const input = inputSchema.parse(args);
      try {
        const data = await httpClient.get<{
          items: Record<string, unknown>[];
          total_count: number;
          page: number;
          per_page: number;
        }>("/items", {
          params: {
            page: input.page,
            per_page: input.per_page,
            search: input.search,
            category_id: input.category_id,
            status: input.status,
          },
        });

        return filteredListToolResponse(
          data.items,
          { total_count: data.total_count, page: data.page, per_page: data.per_page },
          "items",
          filter,
        );
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
