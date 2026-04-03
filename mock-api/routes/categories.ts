import { Router } from "express";
import { categories } from "../data.js";
import { requireAuth } from "../auth.js";

const router = Router();

// All category routes require authentication
router.use(requireAuth);

/**
 * GET /categories — List all categories.
 */
router.get("/", (_req, res) => {
  res.json({ categories, total_count: categories.length });
});

/**
 * GET /categories/:id — Get a single category by ID.
 */
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const category = categories.find((c) => c.id === id);

  if (!category) {
    res.status(404).json({ error: `Category with id ${id} not found` });
    return;
  }

  res.json(category);
});

export default router;
