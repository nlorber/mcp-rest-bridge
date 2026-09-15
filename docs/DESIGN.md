# Design Decisions

Non-obvious architectural choices and their rationale.

## Allowlist-Based Field Filtering

Fields are selected by an explicit allowlist, not removed by a denylist. When the upstream API adds new fields (e.g. a `warehouse_id` column), they are hidden from the LLM by default. A denylist would expose new fields until someone remembers to add them to the blocklist — the wrong default for LLM-facing data.

Trade-off: adding a legitimate new field requires updating two places (the API response type and the filter definition). This friction is intentional.

The same fail-closed rule applies inside values. A plain allowlisted key whose value is an object, or an array holding one, is dropped: passing it through would expose every nested field, present and future. Nested data must be selected with explicit dot-paths (`price.amount`). The ceiling is that arrays of objects cannot be exposed at all until the filter supports element paths.

See: `src/api/filters/definitions.ts`

## Per-Server Tool Registry

Each `createMcpServer()` call builds its own `ToolRegistry` (`src/protocol/tools/registry.ts`) and threads it through `registerAllTools()` and `createCallToolHandler()`, rather than tools living in a module-level map.

The HTTP transport creates one `Server` per session, and each session's tools close over that session's HTTP client. With a shared map, the newest session's handlers would serve every open session — harmless while all sessions share one upstream credential, and wrong the moment they do not. Threading the registry costs one parameter on two functions, and in exchange a server's tool surface is owned by that server and goes away with it; tests build a registry per case instead of resetting global state.

## File-Based Prompt Templates

Prompts live as Markdown files in `prompts/` with a `metadata.json` index, rather than being defined inline in TypeScript. This separates prompt content from code: templates can be reviewed, edited, or authored by non-developers (prompt engineers, domain experts) without touching the TypeScript codebase.

The `{{variable}}` and `{{#if variable}}` syntax is a minimal custom engine (~60 lines in `src/protocol/prompts/template.ts`) rather than a dependency like Handlebars or Mustache. The full power of those libraries is unnecessary and would add attack surface for template injection.

## Custom Zod-to-JSON-Schema

`src/utils/zod-helpers.ts` converts Zod schemas to JSON Schema objects for MCP tool `inputSchema`. The `zod-to-json-schema` npm package exists but generates full JSON Schema with `$schema`, `$ref`, `definitions`, and features the MCP SDK does not need.

The custom helper produces exactly the subset MCP tools require: `type`, `properties`, `required`, `description`, `enum`, `default`. It handles `ZodOptional`, `ZodDefault`, `ZodString`, `ZodNumber`, `ZodBoolean`, `ZodEnum`, and `ZodArray`. This is ~75 lines with zero dependencies and fully controlled output.

## TtlCache Utility

`src/utils/cache.ts` provides a generic TTL cache with concurrent request deduplication. It is not used by the default template tools, but is available for tool handlers that need to cache infrequently-changing data (e.g. categories, configuration, permission sets).

The deduplication pattern (shared inflight promise) is the same one used by `TokenManager` — concurrent callers share a single fetch rather than triggering parallel identical requests.

See the [Customization Guide](CUSTOMIZATION.md#step-4-implement-your-tools) for usage.
