import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Logger } from "../../src/logger.js";
import { createMcpServer } from "../../src/server.js";
import { loadConfig } from "../../src/config.js";

/**
 * Wire an MCP client to the bridge's server over an in-process transport.
 * Shared by the adversarial runner and the live agent demo so both exercise the
 * exact same server, filters, and tool surface a real LLM client would see.
 */
export async function createMcpClient(): Promise<Client> {
  const config = loadConfig();
  const logger = new Logger("error");
  const server = createMcpServer(config, logger);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "adversarial-runner", version: "1.0.0" });

  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

/**
 * Convert the MCP server's tools to Anthropic tool definitions.
 */
export async function getAnthropicTools(
  mcpClient: Client,
): Promise<Anthropic.Messages.Tool[]> {
  const { tools } = await mcpClient.listTools();
  return tools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Anthropic.Messages.Tool["input_schema"],
  }));
}
