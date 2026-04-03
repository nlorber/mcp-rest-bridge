import { z } from "zod";
import type { ToolDefinition } from "../../protocol/tools/registry.js";
import { filteredListToolResponse } from "../../protocol/tools/response.js";
import { createFilter } from "../../api/filters/definitions.js";
import { mapApiError } from "../../api/errors.js";
import { zodToJsonSchema } from "../../utils/zod-helpers.js";
import { TtlCache } from "../../utils/cache.js";
import type { HttpClient } from "../../api/client.js";

const inputSchema = z.object({});

/** Categories change infrequently — cache for 5 minutes. */
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Create the list_categories tool definition.
 */
export function listCategoriesTool(httpClient: HttpClient): ToolDefinition {
  const filter = createFilter("category:list");
  const cache = new TtlCache(
    () =>
      httpClient.get<{ categories: Record<string, unknown>[]; total_count: number }>("/categories"),
    CATEGORY_CACHE_TTL_MS,
  );

  return {
    tool: {
      name: "list_categories",
      description: "List all available categories.",
      inputSchema: zodToJsonSchema(inputSchema),
    },
    handler: async () => {
      try {
        const data = await cache.get();

        return filteredListToolResponse(
          data.categories,
          { total_count: data.total_count, page: 1, per_page: data.total_count },
          "categories",
          filter,
        );
      } catch (error) {
        mapApiError(error);
      }
    },
  };
}
