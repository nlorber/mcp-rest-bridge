import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { users } from "./data.js";

const JWT_SECRET = "mcp-rest-bridge-dev-secret";
const TOKEN_EXPIRY = 3600; // 1 hour

interface TokenPayload {
  sub: number;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token for a user.
 */
export function generateToken(userId: number, username: string, role: string): string {
  return jwt.sign({ sub: userId, username, role }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Validate credentials and return a token response.
 */
export function authenticateUser(
  username: string,
  password: string,
): { access_token: string; token_type: string; expires_in: number } | null {
  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) return null;

  const token = generateToken(user.id, user.username, user.role);
  return {
    access_token: token,
    token_type: "bearer",
    expires_in: TOKEN_EXPIRY,
  };
}

/**
 * Express middleware that verifies the Bearer token.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
    // Attach user info to request for downstream use
    (req as Request & { user?: TokenPayload }).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
