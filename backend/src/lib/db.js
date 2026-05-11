// =============================================================================
// zazenware — lib/db.js
// =============================================================================
// Single shared PostgreSQL connection pool. One instance per Node process.
// Always import { pool } from this file. Never create a new Pool elsewhere.
// =============================================================================

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("[zw] DATABASE_URL is not set. Copy backend/.env.example to .env and fill it in.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Sensible local-dev defaults; Railway will set its own via PG* envs
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.PGSSLMODE === "require"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("[zw] Unexpected error on idle DB client:", err);
});

/**
 * Run a parameterized query. Always prefer this over direct pool.query
 * for the call-site logging it gives us in development.
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.NODE_ENV !== "production" && process.env.PG_LOG_QUERIES === "true") {
      const ms = Date.now() - start;
      console.log(`[zw][db] ${ms}ms — ${text.slice(0, 80).replace(/\s+/g, " ")}`);
    }
    return result;
  } catch (err) {
    console.error("[zw][db] Query failed:", err.message, "\n  SQL:", text);
    throw err;
  }
}

/**
 * Run a callback inside a transaction. Commits on success, rolls back on throw.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => { /* ignore */ });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Confirm we can reach the database. Used by /api/health.
 */
export async function pingDb() {
  await pool.query("SELECT 1");
  return true;
}

/**
 * Cleanly close the pool on shutdown.
 */
export async function closePool() {
  await pool.end();
}
