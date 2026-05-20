// =============================================================================
// zazenware — backend/server.js
// =============================================================================

import "dotenv/config";
import { app } from "./src/app.js";
import { closePool } from "./src/lib/db.js";

const PORT = Number(process.env.PORT) || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = app.listen(PORT, () => {
  console.log(`[zw] zazenware backend listening on port ${PORT}`);
  console.log(`[zw] NODE_ENV=${NODE_ENV}`);

  if (NODE_ENV !== "production") {
    console.log(`[zw] Local API: http://localhost:${PORT}/api`);
    console.log(`[zw] Local health: http://localhost:${PORT}/api/health`);
  }
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[zw] Received ${signal}. Shutting down gracefully...`);

  server.close(async (err) => {
    if (err) {
      console.error("[zw] Error closing HTTP server:", err);
      process.exit(1);
    }

    try {
      await closePool();
      console.log("[zw] Database pool closed.");
    } catch (poolErr) {
      console.error("[zw] Error closing DB pool:", poolErr);
    }

    console.log("[zw] HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.warn("[zw] Forcing shutdown after 10s timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  console.error("[zw] Uncaught exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[zw] Unhandled promise rejection:", reason);
  shutdown("unhandledRejection");
});