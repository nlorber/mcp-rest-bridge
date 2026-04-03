# Customization Guide

How to adapt mcp-rest-bridge to wrap your own REST API.

## Step 1: Configure your API connection

Edit `.env` (copy from `.env.example`):

```
API_BASE_URL=https://your-api.example.com
API_USERNAME=your-username
API_PASSWORD=your-password
```

Update `src/config.ts` if your API uses different authentication (API keys, OAuth, etc.).

## Step 2: Adapt the auth layer

**Token Manager** (`src/api/auth/token-manager.ts`):
- Update the `authenticate()` method to match your API's auth endpoint
- Adjust token decoding if your JWT has a different structure
- Change the refresh buffer if your tokens have different expiry patterns


## Step 3: Define your entities and field filters

**Filter Definitions** (`src/api/filters/definitions.ts`):
- Define allowlists for each entity type (list mode and detail mode)
- The key security principle: only fields in the allowlist are sent to the LLM
- Internal fields, IDs, and sensitive data should never be in these lists

```typescript
const MY_ENTITY_LIST_FIELDS = ["id", "name", "status", "created_at"];
const MY_ENTITY_DETAIL_FIELDS = [...MY_ENTITY_LIST_FIELDS, "description", "metadata"];
```

## Step 4: Implement your tools

Create a new directory under `src/tools/` for each entity:

```
src/tools/your-entity/
├── list.ts
├── get.ts
├── create.ts
├── update.ts
└── delete.ts
```

Each tool follows the same pattern:
1. Define a Zod input schema
2. Create a `ToolDefinition` with the tool metadata and handler
3. In the handler: validate → call HttpClient → filter → respond

Register your tools in `src/tools/index.ts`.

**Caching:** For data that changes infrequently (categories, config, permission sets), use the built-in `TtlCache` from `src/utils/cache.ts`. It supports TTL-based expiry and deduplicates concurrent requests:

```typescript
import { TtlCache } from "../utils/cache.js";

const categoryCache = new TtlCache(() => httpClient.get("/categories"), 300_000);

// In your tool handler:
const data = await categoryCache.get(); // fetches once, caches for 5 minutes
```

## Step 5: Update response instructions

Edit the `INSTRUCTIONS` constant in `src/protocol/tools/response.ts` to match your domain:

```typescript
const INSTRUCTIONS = [
  "[INSTRUCTIONS]",
  "When presenting this data to the user:",
  "- Never show internal IDs or database references.",
  "- Translate field names into natural language.",
  // Add domain-specific rules...
].join("\n");
```

## Step 6: Create your prompts

1. Add template files to `prompts/` (Markdown with `{{variable}}` placeholders)
2. Register them in `prompts/metadata.json`
3. Prompts support `{{#if variable}}...{{/if}}` conditionals

## Step 7: Configure resources

Edit `src/protocol/resources/handler.ts` to expose your API's metadata:
- Update the API spec resource with your actual endpoints
- Add domain-specific resources as needed

## Step 8: Update server instructions

Edit the `instructions` field in `src/server.ts` to guide the LLM on when and how to use your tools.

## Step 9: Write tests

- **Unit tests**: Add tests for your field filters and any custom logic
- **Integration tests**: Test each tool via InMemoryTransport
- **Adversarial tests**: Update scenarios in `tests/adversarial/scenarios.ts` to match your domain

## Step 10: Remove the mock API

Once connected to your real API, you can delete the `mock-api/` directory. The mock is only needed for demo and development.
