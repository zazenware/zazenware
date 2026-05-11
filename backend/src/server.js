// =============================================================================
// zazenware — server.js
// =============================================================================
// Process entry. Boots the Express app, starts the HTTP listener, and wires
// graceful shutdown for SIGTERM/SIGINT (Railway sends SIGTERM on redeploy).
//
// Authority: backend is authoritative for prices, totals, statuses (Master Spec § 12).
// =============================================================================

import "dotenv/config";
import { app } from "./app.js";
import { pool, closePool } from "./lib/db.js";

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  console.log(`[zw] zazenware backend listening on http://localhost:${PORT}`);
  console.log(`[zw] NODE_ENV=${NODE_ENV}`);
  console.log(`[zw] Health: http://localhost:${PORT}/api/health`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[zw] Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      console.error("[zw] Error closing HTTP server:", err);
      process.exit(1);
    }
    console.log("[zw] HTTP server closed.");
  });

  // Give in-flight requests up to 10 seconds, then force-exit
  setTimeout(() => {
    console.warn("[zw] Forcing shutdown after 10s timeout.");
    process.exit(1);
  }, 10000).unref();

  // Close DB pool
  try {
    await closePool();
    console.log("[zw] Database pool closed.");
  } catch (err) {
    console.error("[zw] Error closing DB pool:", err);
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Last-ditch error handlers — log and exit (process manager will restart us)
process.on("uncaughtException", (err) => {
  console.error("[zw] Uncaught exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[zw] Unhandled promise rejection:", reason);
  shutdown("unhandledRejection");
});
