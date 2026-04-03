import { describe, it, expect, beforeAll } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createTestClient, createMockHttpClient, parseToolText } from "./helpers/mcp-test-client.js";

describe("Tool Integration Tests", () => {
  let client: Client;
  let mockHttp: ReturnType<typeof createMockHttpClient>;

  beforeAll(async () => {
    const ctx = await createTestClient();
    client = ctx.client;
    mockHttp = ctx.mockHttpClient;
  });

  describe("listTools", () => {
    it("should list all 7 tools", async () => {
      const result = await client.listTools();
      expect(result.tools).toHaveLength(7);
      const names = result.tools.map((t) => t.name);
      expect(names).toContain("list_items");
      expect(names).toContain("get_item");
      expect(names).toContain("create_item");
      expect(names).toContain("update_item");
      expect(names).toContain("delete_item");
      expect(names).toContain("list_categories");
      expect(names).toContain("get_category");
    });
  });

  describe("list_items", () => {
    it("should return filtered paginated results", async () => {
      mockHttp.get.mockResolvedValueOnce({
        items: [
          {
            id: 1,
            name: "Keyboard",
            price: 79.99,
            category_id: 1,
            stock: 150,
            status: "active",
            internal_code: "SKU-KB-7842",
            supplier_id: 4012,
            cost_price: 32.5,
            margin_pct: 59.4,
          },
        ],
        total_count: 1,
        page: 1,
        per_page: 10,
      });

      const result = await client.callTool({ name: "list_items", arguments: {} });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data.total_count).toBe(1);
      const items = data.items as Record<string, unknown>[];
      expect(items[0]).not.toHaveProperty("internal_code");
      expect(items[0]).not.toHaveProperty("supplier_id");
      expect(items[0]).not.toHaveProperty("cost_price");
      expect(items[0]).not.toHaveProperty("margin_pct");
      expect(items[0]).toHaveProperty("name", "Keyboard");
    });
  });

  describe("get_item", () => {
    it("should return a filtered item detail", async () => {
      mockHttp.get.mockResolvedValueOnce({
        id: 1,
        name: "Keyboard",
        description: "A great keyboard",
        price: 79.99,
        category_id: 1,
        stock: 150,
        status: "active",
        created_at: "2025-01-15T10:00:00Z",
        updated_at: "2025-03-01T14:30:00Z",
        internal_code: "SKU-KB-7842",
        supplier_id: 4012,
        cost_price: 32.5,
        margin_pct: 59.4,
      });

      const result = await client.callTool({ name: "get_item", arguments: { id: 1 } });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data).toHaveProperty("description", "A great keyboard");
      expect(data).toHaveProperty("created_at");
      expect(data).not.toHaveProperty("internal_code");
      expect(data).not.toHaveProperty("cost_price");
    });
  });

  describe("create_item", () => {
    it("should create and return a filtered item", async () => {
      mockHttp.post.mockResolvedValueOnce({
        id: 8,
        name: "New Widget",
        description: "",
        category_id: 1,
        price: 29.99,
        stock: 0,
        status: "active",
        created_at: "2025-04-01T00:00:00Z",
        updated_at: "2025-04-01T00:00:00Z",
        internal_code: "SKU-NEW-XYZ",
        supplier_id: 9999,
        cost_price: 12.0,
        margin_pct: 60.0,
      });

      const result = await client.callTool({
        name: "create_item",
        arguments: { name: "New Widget", category_id: 1, price: 29.99 },
      });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data).toHaveProperty("id", 8);
      expect(data).not.toHaveProperty("internal_code");
    });
  });

  describe("delete_item", () => {
    it("should return success confirmation", async () => {
      mockHttp.delete.mockResolvedValueOnce(undefined);

      const result = await client.callTool({ name: "delete_item", arguments: { id: 1 } });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("deleted_id", 1);
    });
  });

  describe("list_categories", () => {
    it("should return filtered categories", async () => {
      mockHttp.get.mockResolvedValueOnce({
        categories: [
          {
            id: 1,
            name: "Electronics",
            description: "Electronic devices",
            item_count: 3,
            internal_code: "CAT-ELEC-001",
            sort_order: 10,
          },
        ],
        total_count: 1,
      });

      const result = await client.callTool({ name: "list_categories", arguments: {} });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      const categories = data.categories as Record<string, unknown>[];
      expect(categories[0]).not.toHaveProperty("internal_code");
      expect(categories[0]).not.toHaveProperty("sort_order");
      expect(categories[0]).toHaveProperty("name", "Electronics");
    });
  });

  describe("update_item", () => {
    it("should update and return a filtered item", async () => {
      mockHttp.patch.mockResolvedValueOnce({
        id: 1,
        name: "Updated Keyboard",
        description: "Updated description",
        category_id: 1,
        price: 89.99,
        stock: 140,
        status: "active",
        created_at: "2025-01-15T10:00:00Z",
        updated_at: "2025-04-01T12:00:00Z",
        internal_code: "SKU-KB-7842",
        supplier_id: 4012,
        cost_price: 32.5,
        margin_pct: 55.0,
      });

      const result = await client.callTool({
        name: "update_item",
        arguments: { id: 1, name: "Updated Keyboard", price: 89.99 },
      });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data).toHaveProperty("name", "Updated Keyboard");
      expect(data).toHaveProperty("price", 89.99);
      expect(data).toHaveProperty("description");
      expect(data).not.toHaveProperty("internal_code");
      expect(data).not.toHaveProperty("supplier_id");
      expect(data).not.toHaveProperty("cost_price");
      expect(data).not.toHaveProperty("margin_pct");
    });
  });

  describe("get_category", () => {
    it("should return a filtered category detail", async () => {
      mockHttp.get.mockResolvedValueOnce({
        id: 1,
        name: "Electronics",
        description: "Electronic devices",
        item_count: 3,
        internal_code: "CAT-ELEC-001",
        sort_order: 10,
      });

      const result = await client.callTool({
        name: "get_category",
        arguments: { id: 1 },
      });
      const content = result.content as { type: string; text: string }[];
      const data = parseToolText(content[0].text) as Record<string, unknown>;

      expect(data).toHaveProperty("name", "Electronics");
      expect(data).toHaveProperty("item_count", 3);
      expect(data).not.toHaveProperty("internal_code");
      expect(data).not.toHaveProperty("sort_order");
    });
  });
});
