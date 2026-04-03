import { Router } from "express";
import { items, getNextItemId, type Item } from "../data.js";
import { requireAuth } from "../auth.js";

const router = Router();

// All item routes require authentication
router.use(requireAuth);

/**
 * GET /items — List items with pagination and search.
 * Query params: page, per_page, search, category_id, status
 */
router.get("/", (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page as string) || 10));
  const search = (req.query.search as string)?.toLowerCase();
  const categoryId = req.query.category_id ? parseInt(req.query.category_id as string) : undefined;
  const status = req.query.status as string | undefined;

  let filtered = [...items];

  if (search) {
    filtered = filtered.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.description.toLowerCase().includes(search),
    );
  }

  if (categoryId) {
    filtered = filtered.filter((item) => item.category_id === categoryId);
  }

  if (status) {
    filtered = filtered.filter((item) => item.status === status);
  }

  const totalCount = filtered.length;
  const start = (page - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  res.json({
    items: pageItems,
    total_count: totalCount,
    page,
    per_page: perPage,
  });
});

/**
 * GET /items/:id — Get a single item by ID.
 */
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find((i) => i.id === id);

  if (!item) {
    res.status(404).json({ error: `Item with id ${id} not found` });
    return;
  }

  res.json(item);
});

/**
 * POST /items — Create a new item.
 */
router.post("/", (req, res) => {
  const body = req.body as Partial<Item>;

  if (!body.name || body.category_id === undefined || body.price === undefined) {
    res.status(400).json({ error: "name, category_id, and price are required" });
    return;
  }

  const now = new Date().toISOString();
  const newItem: Item = {
    id: getNextItemId(),
    name: body.name,
    description: body.description ?? "",
    category_id: body.category_id,
    price: body.price,
    stock: body.stock ?? 0,
    status: body.status ?? "active",
    created_at: now,
    updated_at: now,
    // Mock internal fields — these simulate server-side data
    internal_code: `SKU-NEW-${Date.now().toString(36).toUpperCase()}`,
    supplier_id: 9999,
    cost_price: body.price * 0.4,
    margin_pct: 60.0,
  };

  items.push(newItem);
  res.status(201).json(newItem);
});

/**
 * PATCH /items/:id — Update an item.
 */
router.patch("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const item = items.find((i) => i.id === id);

  if (!item) {
    res.status(404).json({ error: `Item with id ${id} not found` });
    return;
  }

  const body = req.body as Partial<Item>;
  const updatable = ["name", "description", "category_id", "price", "stock", "status"] as const;

  for (const key of updatable) {
    if (body[key] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item as any)[key] = body[key];
    }
  }
  item.updated_at = new Date().toISOString();

  res.json(item);
});

/**
 * DELETE /items/:id — Delete an item.
 */
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    res.status(404).json({ error: `Item with id ${id} not found` });
    return;
  }

  items.splice(index, 1);
  res.status(204).send();
});

export default router;
