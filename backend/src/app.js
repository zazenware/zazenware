// =============================================================================
// zazenware — app.js
// =============================================================================
// Express app configuration. Stays separate from server.js so the app can be
// imported and tested without binding to a port.
// =============================================================================

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { healthRouter } from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();

// ─── Security & request hygiene ───────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1); // we'll be behind Railway's proxy in production

app.use(helmet({
  // We're an API; the frontend is on a separate origin. Default CSP off.
  contentSecurityPolicy: false,
  // Allow same-origin reads (helps when curl-checking /api/health locally)
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────
// CORS_ORIGIN is a comma-separated list. In dev it's typically:
//   http://localhost:5173
// In production it'll be:
//   https://zazenware.com,https://www.zazenware.com
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow tools without an Origin header (curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("CORS: origin not allowed"));
  },
  credentials: false,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Idempotency-Key"],
  maxAge: 600,
}));

// ─── Body parsing ─────────────────────────────────────────────────────────
app.use(express.json({ limit: "100kb" })); // tiny limit — we never accept big payloads

// ─── Logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/api", healthRouter);

// Root info (handy when poking the API directly)
app.get("/", (_req, res) => {
  res.json({
    name: "zazenware-api",
    status: "ok",
    docs: "See Master Spec § 14 for the API contract.",
  });
});

// ─── Error handlers (must come last) ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export { app };
