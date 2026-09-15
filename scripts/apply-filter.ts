/**
 * Demo helper: read a JSON object (or array) from stdin and print it after applying the
 * MCP server's allowlist field filter — the exact filter the server applies to every tool
 * response (see `src/api/filters/`). Used by `scripts/demo.sh`; not part of the build.
 *
 *   curl ... | npx tsx scripts/apply-filter.ts item:detail
 *
 * With `--diff`, instead of printing the filtered object, render the upstream object as a
 * git-style diff: allowlisted fields as context, stripped fields as red `-` lines — so the
 * "what the bridge removes" moment is legible at a glance.
 *
 *   curl ... | npx tsx scripts/apply-filter.ts --diff item:detail
 */
import { createFilter, type FilterName } from "../src/api/filters/definitions.js";

const C = { reset: "\x1b[0m", dim: "\x1b[2m", red: "\x1b[31m" };

const args = process.argv.slice(2);
const diffMode = args.includes("--diff");
const filterName = (args.find((a) => !a.startsWith("--")) ?? "item:detail") as FilterName;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Render one upstream record as a diff against what the filter actually returns: kept fields
 * are context lines, dropped fields are red `-` lines, in their original position. Nested
 * objects are walked the same way, so a key kept only in part (`dimensions` minus
 * `warehouse_bin`) shows exactly which of its fields survive.
 */
function renderDiff(record: Record<string, unknown>, kept: Record<string, unknown>, indent = "  "): string {
  const keys = Object.keys(record);
  const lines = [`${indent}{`];

  keys.forEach((key, i) => {
    const comma = i < keys.length - 1 ? "," : "";
    const raw = record[key];
    const keptValue = Object.hasOwn(kept, key) ? kept[key] : undefined;

    if (keptValue === undefined) {
      lines.push(`${indent}${C.red}- "${key}": ${JSON.stringify(raw)}${comma}${C.reset}`);
      return;
    }

    if (isPlainObject(raw) && isPlainObject(keptValue)) {
      lines.push(`${indent}  ${C.dim}"${key}": ${C.reset}`);
      lines.push(renderDiff(raw, keptValue, indent + "  ") + comma);
      return;
    }

    lines.push(`${indent}  ${C.dim}"${key}": ${JSON.stringify(raw)}${comma}${C.reset}`);
  });

  lines.push(`${indent}}`);
  return lines.join("\n");
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data: unknown = JSON.parse(raw);
  const filter = createFilter(filterName);

  if (diffMode) {
    const records = (Array.isArray(data) ? data : [data]).filter(isPlainObject);
    process.stdout.write(records.map((r) => renderDiff(r, filter(r))).join("\n") + "\n");
    return;
  }

  const filtered = Array.isArray(data) ? data.map((d) => filter(d)) : filter(data);
  process.stdout.write(JSON.stringify(filtered, null, 2) + "\n");
});
