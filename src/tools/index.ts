import type { ToolRegistry } from "../protocol/tools/registry.js";
import type { HttpClient } from "../api/client.js";
import { listItemsTool } from "./items/list.js";
import { getItemTool } from "./items/get.js";
import { createItemTool } from "./items/create.js";
import { updateItemTool } from "./items/update.js";
import { deleteItemTool } from "./items/delete.js";
import { listCategoriesTool } from "./categories/list.js";
import { getCategoryTool } from "./categories/get.js";

/**
 * Register all tool definitions in one server's registry.
 */
export function registerAllTools(registry: ToolRegistry, httpClient: HttpClient): void {
  // Items CRUD
  registry.register(listItemsTool(httpClient));
  registry.register(getItemTool(httpClient));
  registry.register(createItemTool(httpClient));
  registry.register(updateItemTool(httpClient));
  registry.register(deleteItemTool(httpClient));

  // Categories
  registry.register(listCategoriesTool(httpClient));
  registry.register(getCategoryTool(httpClient));
}
