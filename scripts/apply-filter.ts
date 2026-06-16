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
import {
  createFilter,
  getFilterFields,
  type FilterName,
} from "../src/api/filters/definitions.js";

const C = { reset: "\x1b[0m", dim: "\x1b[2m", red: "\x1b[31m" };

const args = process.argv.slice(2);
const diffMode = args.includes("--diff");
const filterName = (args.find((a) => !a.startsWith("--")) ?? "item:detail") as FilterName;

/**
 * Render one upstream record as a diff: allowlisted fields are context lines, fields the
 * filter strips are red `-` lines, shown in their original position in the object.
 */
function renderDiff(record: Record<string, unknown>, allow: string[]): string {
  const allowed = new Set(allow.map((f) => f.split(".")[0]));
  const keys = Object.keys(record);
  const lines = ["  {"];
  keys.forEach((key, i) => {
    const comma = i < keys.length - 1 ? "," : "";
    const val = JSON.stringify(record[key]);
    if (allowed.has(key)) {
      lines.push(`    ${C.dim}"${key}": ${val}${comma}${C.reset}`);
    } else {
      lines.push(`  ${C.red}- "${key}": ${val}${comma}${C.reset}`);
    }
  });
  lines.push("  }");
  return lines.join("\n");
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data: unknown = JSON.parse(raw);

  if (diffMode) {
    const allow = getFilterFields(filterName);
    const records = (Array.isArray(data) ? data : [data]).filter(
      (r): r is Record<string, unknown> => r !== null && typeof r === "object",
    );
    process.stdout.write(records.map((r) => renderDiff(r, allow)).join("\n") + "\n");
    return;
  }

  const filter = createFilter(filterName);
  const filtered = Array.isArray(data) ? data.map((d) => filter(d)) : filter(data);
  process.stdout.write(JSON.stringify(filtered, null, 2) + "\n");
});
