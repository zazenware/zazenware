// =============================================================================
// zazenware — routes/health.routes.js
// =============================================================================
// GET /api/health
//
// Returns:
//   200 { status: "ok", db: "ok",   uptime: <seconds>, version: "1.0.0" }
//   503 { status: "ok", db: "fail", uptime: <seconds>, version: "1.0.0" }
//
// "status: 'ok'" reports the API process itself is alive. "db" reports
// whether the SELECT 1 query succeeded. Railway and any uptime monitor
// should treat 503 as unhealthy.
// =============================================================================

import { Router } from "express";
import { pingDb } from "../lib/db.js";

const VERSION = "1.0.0";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  const base = {
    status: "ok",
    uptime: Math.floor(process.uptime()),
    version: VERSION,
    timestamp: new Date().toISOString(),
  };

  try {
    await pingDb();
    return res.status(200).json({ ...base, db: "ok" });
  } catch (err) {
    console.error("[zw] /api/health: DB ping failed:", err.message);
    return res.status(503).json({ ...base, db: "fail" });
  }
});
