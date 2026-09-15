# Security Model

mcp-rest-bridge implements defense-in-depth for MCP server security. Multiple layers work together to prevent data leakage and unauthorized actions.

## Layer 1: Field Filtering (Allowlist)

Every API response passes through an allowlist-based field filter before reaching the LLM. Fields not in the allowlist are silently dropped.

**How it works:**
- Each entity type has separate allowlists for `list` and `detail` modes
- Defined in `src/api/filters/definitions.ts`
- Applied automatically by `filteredToolResponse()` and `filteredListToolResponse()`

**What gets stripped:**
The mock API includes "trap" fields that exist in raw responses but must never reach the LLM:
- `internal_code` — internal SKU/reference codes
- `supplier_id` — supplier relationship IDs
- `cost_price` — wholesale cost (margin-sensitive)
- `margin_pct` — profit margin percentage
- `sort_order` — internal ordering metadata

**Nested fields & prototype hardening:**
Allowlists support dot-notation paths of arbitrary depth (e.g. `details.weight`). A plain
allowlisted key passes only primitives and arrays of primitives: when its value is an object, or
an array holding one, the key is dropped, so a trap field nested under an allowlisted key
(`price: { amount, cost_price }`) cannot ride along. Nested data reaches the LLM only through
explicit dot-paths, and dot-paths never traverse arrays, so arrays of objects are never exposed.
The filter copies only own properties and ignores `__proto__` / prototype-chain keys, so a
crafted payload cannot smuggle fields through prototype pollution.

## Layer 2: Response Instructions

Every tool response includes embedded LLM instructions that guide presentation behavior:

```
[INSTRUCTIONS]
When presenting this data to the user:
- Never show internal IDs or technical identifiers.
- Never show internal fields (internal_code, supplier_id, cost_price, margin_pct).
- Use human-readable values only.
- Translate field names into natural language.
```

Even if a field slips through the filter, the LLM is instructed not to display it.

## Layer 3: Server Instructions

The MCP server declares behavioral guidance in its capabilities:

```
You are connected to a REST API via MCP tools.
Always confirm before creating, updating, or deleting items.
```

This guides the client LLM's overall behavior.

## Layer 4: Input Validation

Every tool input is validated with Zod schemas. Invalid or unexpected parameters are rejected before any API call is made.

## Layer 5: Credential Security

- JWT tokens cached in memory, never logged or exposed
- The config resource (`config://server/settings`) explicitly excludes sensitive fields
- **Scope — outbound, not inbound:** this layer secures the *upstream* API credential the bridge holds (the JWT it presents to the REST API). It does **not** authenticate *inbound* MCP traffic: the HTTP transport is not itself authenticated and assumes a trusted network / proxy-terminated auth (stdio, the default transport, is trusted by process boundary). See [TRANSPORT.md](TRANSPORT.md#http-transport) for where to add a bearer-token check if you expose HTTP beyond a trusted network.

## Layer 6: Error Handling

- Tool failures (upstream API errors, timeouts) are returned as tool results with `isError: true`, so the model sees what went wrong and can recover; malformed calls (unknown tool, arguments that fail the schema) are protocol errors (`InvalidParams`)
- Only messages written by the bridge reach the model (`src/api/errors.ts`): upstream response bodies are untrusted and are logged server-side, never forwarded, and unrecognized errors surface as a generic failure
- Stack traces and internal details are not exposed to the LLM
- The logger redacts sensitive keys in all contexts

## Layer 7: Adversarial Testing

Automated LLM-as-judge tests validate security across 7 categories:
1. **Data isolation** — cross-tenant access attempts
2. **Direct injection** — system prompt override attempts
3. **Indirect injection** — instructions embedded in data
4. **Privilege escalation** — unauthorized bulk/destructive actions
5. **System info extraction** — internal URL/token disclosure
6. **Multi-turn** — progressive trust-building attacks
7. **Nested-field bypass** — trap fields hidden inside nested objects/arrays

See [ADVERSARIAL_TESTING.md](ADVERSARIAL_TESTING.md) for details.
