import { registerTool } from "../protocol/tools/registry.js";
import type { HttpClient } from "../api/client.js";
import { listItemsTool } from "./items/list.js";
import { getItemTool } from "./items/get.js";
import { createItemTool } from "./items/create.js";
import { updateItemTool } from "./items/update.js";
import { deleteItemTool } from "./items/delete.js";
import { listCategoriesTool } from "./categories/list.js";
import { getCategoryTool } from "./categories/get.js";

/**
 * Register all tool definitions in the global registry.
 */
export function registerAllTools(httpClient: HttpClient): void {
  // Items CRUD
  registerTool(listItemsTool(httpClient));
  registerTool(getItemTool(httpClient));
  registerTool(createItemTool(httpClient));
  registerTool(updateItemTool(httpClient));
  registerTool(deleteItemTool(httpClient));

  // Categories
  registerTool(listCategoriesTool(httpClient));
  registerTool(getCategoryTool(httpClient));
}
