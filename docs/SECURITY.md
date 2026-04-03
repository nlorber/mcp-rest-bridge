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

## Layer 6: Error Handling

- API errors are mapped to sanitized MCP errors (`src/api/errors.ts`)
- Stack traces and internal details are not exposed to the LLM
- The logger redacts sensitive keys in all contexts

## Layer 7: Adversarial Testing

Automated LLM-as-judge tests validate security across 6 categories:
1. **Data isolation** — cross-tenant access attempts
2. **Direct injection** — system prompt override attempts
3. **Indirect injection** — instructions embedded in data
4. **Privilege escalation** — unauthorized bulk/destructive actions
5. **System info extraction** — internal URL/token disclosure
6. **Multi-turn** — progressive trust-building attacks

See [ADVERSARIAL_TESTING.md](ADVERSARIAL_TESTING.md) for details.
