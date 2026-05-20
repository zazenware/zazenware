// =============================================================================
// zazenware — backend/src/app.js
// =============================================================================
// Express app configuration. Stays separate from server.js so the app can be
// imported and tested without binding to a port.
// =============================================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { healthRouter } from "./routes/health.routes.js";
import { designsRouter } from "./routes/designs.routes.js";
import { ordersRouter } from "./routes/orders.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();

const NODE_ENV = process.env.NODE_ENV || "development";

const allowedOrigins = (
  process.env.CORS_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// ─── Security & request hygiene ───────────────────────────────────────────

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// ─── CORS ─────────────────────────────────────────────────────────────────

app.use(
  cors({
    origin(origin, callback) {
      // Allows curl, health checks, same-origin requests, and server-to-server tools.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Idempotency-Key"],
    maxAge: 600,
  })
);

// ─── Body parsing ─────────────────────────────────────────────────────────

app.use(express.json({ limit: "100kb" }));

// ─── Logging ──────────────────────────────────────────────────────────────

if (NODE_ENV !== "test") {
  app.use(morgan(NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Root / API status ────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    name: "zazenware-api",
    status: "ok",
    docs: "See Master Spec § 14 for the API contract.",
  });
});

app.get("/api", (_req, res) => {
  res.json({
    name: "zazenware-api",
    status: "ok",
    message: "API root is online.",
  });
});

// ─── Routes ───────────────────────────────────────────────────────────

app.use("/api", healthRouter);
app.use("/api", designsRouter);
app.use("/api", ordersRouter);
app.use("/api", contactRouter);

// ─── Diagnostic logging ───────────────────────────────────────────────
console.log("[zw] Routes registered:");
console.log("[zw]   - /api/health");
console.log("[zw]   - /api/designs");
console.log("[zw]   - /api/orders");
console.log("[zw]   - /api/contact");

// ─── Error handlers ───────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export { app };