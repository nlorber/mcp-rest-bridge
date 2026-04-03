import { Router } from "express";
import { authenticateUser } from "../auth.js";

const router = Router();

/**
 * POST /auth/token — Acquire a JWT token.
 */
router.post("/token", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const result = authenticateUser(username, password);
  if (!result) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  res.json(result);
});

export default router;
