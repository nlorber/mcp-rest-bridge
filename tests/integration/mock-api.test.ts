import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { startMockApi } from "../../mock-api/server.js";

const PORT = 14600;
const BASE_URL = `http://localhost:${PORT}`;

async function tokenFor(username: string, password: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return ((await res.json()) as { access_token: string }).access_token;
}

function api(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
}

async function listIds(token: string): Promise<number[]> {
  const body = (await (await api(token, "/items?per_page=100")).json()) as { items: { id: number }[] };
  return body.items.map((item) => item.id);
}

describe("mock API item ownership", () => {
  let server: Server;
  let admin: string;
  let user: string;

  beforeAll(async () => {
    server = startMockApi(PORT);
    await new Promise((resolve) => server.once("listening", resolve));
    admin = await tokenFor("admin", "admin123");
    user = await tokenFor("user", "user123");
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("lists only the caller's own items, whatever the caller's role", async () => {
    expect(await listIds(admin)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(await listIds(user)).toEqual([8, 9]);
  });

  it("answers 404 for another account's item on read, update and delete", async () => {
    expect((await api(admin, "/items/8")).status).toBe(404);
    expect((await api(admin, "/items/8", { method: "PATCH", body: JSON.stringify({ price: 1 }) })).status).toBe(404);
    expect((await api(admin, "/items/8", { method: "DELETE" })).status).toBe(404);
    expect((await api(user, "/items/8")).status).toBe(200);
  });

  it("assigns a created item to its creator", async () => {
    const res = await api(user, "/items", {
      method: "POST",
      body: JSON.stringify({ name: "Tenant item", category_id: 1, price: 10 }),
    });
    const { id } = (await res.json()) as { id: number };

    expect((await api(user, `/items/${id}`)).status).toBe(200);
    expect((await api(admin, `/items/${id}`)).status).toBe(404);
  });

  it("returns nested trap data upstream for the bridge to strip", async () => {
    const item = (await (await api(admin, "/items/1")).json()) as Record<string, unknown>;
    expect(item.dimensions).toHaveProperty("warehouse_bin");
    expect(item.supplier).toHaveProperty("unit_cost");
    expect(Array.isArray(item.variants)).toBe(true);
  });
});
