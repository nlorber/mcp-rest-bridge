import express from "express";
import authRoutes from "./routes/auth.js";
import itemRoutes from "./routes/items.js";
import categoryRoutes from "./routes/categories.js";

const PORT = parseInt(process.env.MOCK_API_PORT ?? "3100");

const app = express();
app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/items", itemRoutes);
app.use("/categories", categoryRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

/**
 * Start the mock API server.
 * Can be imported for programmatic use (tests) or run directly.
 */
export function startMockApi(port = PORT): ReturnType<typeof app.listen> {
  return app.listen(port, () => {
    console.log(`Mock API running on http://localhost:${port}`);
  });
}

export { app };

// Auto-start when run directly
const isDirectRun = process.argv[1]?.includes("mock-api/server");
if (isDirectRun) {
  startMockApi();
}
