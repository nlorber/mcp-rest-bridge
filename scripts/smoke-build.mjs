/**
 * Smoke test for the compiled server: spawn build/src/index.js over stdio and check that
 * prompts and prompt resources load. Unit and integration tests run from source, so they
 * cannot catch a file path that only resolves in the src/ layout. Run after `npm run build`.
 *
 *   npm run smoke:build
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["build/src/index.js"],
  // Listing prompts and resources never calls the upstream API, so placeholder credentials suffice.
  env: {
    ...process.env,
    MCP_TRANSPORT: "stdio",
    API_USERNAME: "smoke",
    API_PASSWORD: "smoke",
    LOG_LEVEL: "error",
  },
});
const client = new Client({ name: "smoke-build", version: "1.0.0" });
await client.connect(transport);

try {
  const { prompts } = await client.listPrompts();
  const { resources } = await client.listResources();
  const promptResource = resources.find((r) => r.uri.startsWith("prompt://"));
  if (prompts.length === 0 || !promptResource) {
    throw new Error(`expected prompts and prompt resources, got ${prompts.length} prompts`);
  }
  await client.readResource({ uri: promptResource.uri });
  console.log(`smoke-build OK: ${prompts.length} prompts, ${resources.length} resources`);
} finally {
  await client.close();
}
