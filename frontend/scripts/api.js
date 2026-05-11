/* ============================================================================
   zazenware — api.js
   ----------------------------------------------------------------------------
   Thin fetch() wrapper used by every page script that talks to the backend.

   Configuration:
     - In dev, the backend lives at http://localhost:4000.
     - In production, it lives at https://api.zazenware.com.
     - The page may override via window.ZW_CONFIG.apiBaseUrl set before
       this module loads.

   Errors:
     The backend always returns { error: { code, message, fields? } } on
     non-2xx. This wrapper throws an ApiError with those fields populated.
   ============================================================================ */

const DEFAULT_BASE = "http://localhost:4000";

function getBase() {
  if (typeof window !== "undefined" && window.ZW_CONFIG?.apiBaseUrl) {
    return String(window.ZW_CONFIG.apiBaseUrl).replace(/\/$/, "");
  }
  return DEFAULT_BASE;
}

export class ApiError extends Error {
  constructor({ status, code, message, fields }) {
    super(message || `API error ${status}`);
    this.status = status;
    this.code = code || "unknown";
    this.fields = fields;
  }
}

async function request(path, { method = "GET", body, headers, signal } = {}) {
  const url = getBase() + path;
  const opts = {
    method,
    headers: { Accept: "application/json", ...(headers || {}) },
    signal,
  };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch (err) {
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  }

  // 204 No Content
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* Non-JSON response */
  }

  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError({
      status: res.status,
      code: err.code || "http_" + res.status,
      message: err.message || res.statusText,
      fields: err.fields,
    });
  }

  return data;
}

export const api = {
  /** GET /api/designs → { designs: [...] } */
  listDesigns(opts) {
    return request("/api/designs", opts);
  },
  /** GET /api/designs/:slug → { design: {...} } */
  getDesign(slug, opts) {
    return request(`/api/designs/${encodeURIComponent(slug)}`, opts);
  },
  /** GET /api/health → { status, db, version, uptime, timestamp } */
  health(opts) {
    return request("/api/health", opts);
  },
};
