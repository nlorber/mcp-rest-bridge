import { pickFields } from "./field-filter.js";

/**
 * Field filter definitions per entity and mode (list vs detail).
 * Fields NOT in these lists (e.g. internal_code, supplier_id, cost_price, margin_pct)
 * are stripped from responses — this is the primary data security mechanism.
 */

// --- Items ---

const ITEM_LIST_FIELDS = ["id", "name", "category_id", "price", "status", "stock"];

const ITEM_DETAIL_FIELDS = [
  ...ITEM_LIST_FIELDS,
  "description",
  "created_at",
  "updated_at",
];

// Trap fields NOT included: internal_code, supplier_id, cost_price, margin_pct

// --- Categories ---

const CATEGORY_LIST_FIELDS = ["id", "name", "description", "item_count"];

const CATEGORY_DETAIL_FIELDS = [...CATEGORY_LIST_FIELDS];

// Trap fields NOT included: internal_code, sort_order

export type FilterName =
  | "item:list"
  | "item:detail"
  | "category:list"
  | "category:detail";

const FILTER_MAP: Record<FilterName, string[]> = {
  "item:list": ITEM_LIST_FIELDS,
  "item:detail": ITEM_DETAIL_FIELDS,
  "category:list": CATEGORY_LIST_FIELDS,
  "category:detail": CATEGORY_DETAIL_FIELDS,
};

/**
 * Get the field allowlist for a given entity/mode combination.
 */
export function getFilterFields(filterName: FilterName): string[] {
  return FILTER_MAP[filterName];
}

/**
 * Create a filter function for a specific entity/mode.
 */
export function createFilter(
  filterName: FilterName,
): (entity: Record<string, unknown>) => Record<string, unknown> {
  const fields = FILTER_MAP[filterName];
  return (entity: Record<string, unknown>) => pickFields(entity, fields);
}
