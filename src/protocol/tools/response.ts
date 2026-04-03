import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

const INSTRUCTIONS = [
  "[INSTRUCTIONS]",
  "When presenting this data to the user:",
  "- Never show internal IDs or technical identifiers.",
  "- Never show internal fields (internal_code, supplier_id, cost_price, margin_pct).",
  "- Use human-readable values only.",
  "- Translate field names into natural language.",
  "- Format prices with currency symbols and dates in a readable format.",
].join("\n");

/**
 * Build a tool response with embedded LLM instructions.
 */
export function toolResponse(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: `${INSTRUCTIONS}\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

/**
 * Build a tool response for a single filtered entity.
 */
export function filteredToolResponse(
  data: Record<string, unknown>,
  filterFn: (entity: Record<string, unknown>) => Record<string, unknown>,
): CallToolResult {
  return toolResponse(filterFn(data));
}

/**
 * Build a tool response for a filtered list with pagination metadata.
 */
export function filteredListToolResponse(
  items: unknown[],
  meta: { total_count: number; page: number; per_page: number },
  listKey: string,
  filterFn: (entity: Record<string, unknown>) => Record<string, unknown>,
): CallToolResult {
  const filtered = items.map((item) => filterFn(item as Record<string, unknown>));
  return toolResponse({
    [listKey]: filtered,
    ...meta,
  });
}

