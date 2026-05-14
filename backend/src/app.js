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

import { healthRouter }  from "./routes/health.routes.js";
import { designsRouter } from "./routes/designs.routes.js";
import { ordersRouter }  from "./routes/orders.routes.js";
import { contactRouter } from "./routes/contact.routes.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();

// ─── Security & request hygiene ───────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// ─── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
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
app.use(express.json({ limit: "100kb" }));

// ─── Logging ──────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// ─── Routes ───────────────────────────────────────────────────────────────
app.use("/api", healthRouter);
app.use("/api", designsRouter);
app.use("/api", ordersRouter);
app.use("/api", contactRouter);

app.get("/", (_req, res) => {
  res.json({
    name: "zazenware-api",
    status: "ok",
    docs: "See Master Spec § 14 for the API contract.",
  });
});

// ─── Error handlers ───────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export { app };
