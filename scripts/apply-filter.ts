/**
 * Demo helper: read a JSON object (or array) from stdin and print it after applying the
 * MCP server's allowlist field filter — the exact filter the server applies to every tool
 * response (see `src/api/filters/`). Used by `scripts/demo.sh`; not part of the build.
 *
 *   curl ... | npx tsx scripts/apply-filter.ts item:detail
 */
import { createFilter, type FilterName } from "../src/api/filters/definitions.js";

const filterName = (process.argv[2] ?? "item:detail") as FilterName;

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  raw += chunk;
});
process.stdin.on("end", () => {
  const data: unknown = JSON.parse(raw);
  const filter = createFilter(filterName);
  const filtered = Array.isArray(data) ? data.map((d) => filter(d)) : filter(data);
  process.stdout.write(JSON.stringify(filtered, null, 2) + "\n");
});
