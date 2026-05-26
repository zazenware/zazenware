/* ============================================================================
   zazenware — frontend/assets/scripts/api.js
   ----------------------------------------------------------------------------
   Thin fetch() wrapper used by every page script that talks to the backend.

   Environment behavior:
     - Local frontend uses local backend:
       http://localhost:5173 → http://localhost:4000

     - Deployed frontend uses Railway backend:
       Netlify / custom domain → Railway API

     - Optional page override:
       window.ZW_CONFIG = { apiBaseUrl: "https://example.com" }

   Important:
     This file contains only public frontend URLs.
     Never put DATABASE_URL, RESEND_API_KEY, passwords, or secrets here.
   ============================================================================ */

const LOCAL_API_BASE_URL = "http://localhost:4000";

// Current Railway backend.
// If your Railway URL changes, update this one line.
const PRODUCTION_API_BASE_URL = "https://api.zazenware.com";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/$/, "");
}

function getBase() {
  if (typeof window !== "undefined" && window.ZW_CONFIG?.apiBaseUrl) {
    return stripTrailingSlash(window.ZW_CONFIG.apiBaseUrl);
  }

  if (typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname)) {
    return LOCAL_API_BASE_URL;
  }

  return PRODUCTION_API_BASE_URL;
}

export const API_BASE_URL = getBase();

export class ApiError extends Error {
  constructor({ status, code, message, fields, details }) {
    super(message || `API error ${status}`);

    this.name = "ApiError";
    this.status = status;
    this.code = code || "unknown";
    this.fields = fields;
    this.details = details;
  }
}

function normalizeApiError(status, statusText, data) {
  // Preferred backend shape:
  // { error: { code, message, fields? } }
  if (data?.error && typeof data.error === "object") {
    return {
      status,
      code: data.error.code || `http_${status}`,
      message: data.error.message || statusText,
      fields: data.error.fields,
      details: data,
    };
  }

  // Alternate backend shape:
  // { error: "Server Error", message: "Something went wrong." }
  if (data?.error || data?.message) {
    return {
      status,
      code: `http_${status}`,
      message: data.message || data.error || statusText,
      fields: data.fields,
      details: data,
    };
  }

  return {
    status,
    code: `http_${status}`,
    message: statusText || `Request failed with status ${status}`,
    details: data,
  };
}

async function request(path, { method = "GET", body, headers, signal } = {}) {
  const url = `${API_BASE_URL}${path}`;

  const options = {
    method,
    headers: {
      Accept: "application/json",
      ...(headers || {}),
    },
    signal,
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, options);
  } catch (_error) {
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    throw new ApiError(normalizeApiError(response.status, response.statusText, data));
  }

  return data;
}

export const api = {
  /** GET /api/health */
  health(options) {
    return request("/api/health", options);
  },

  /** GET /api/designs → { designs: [...] } */
  listDesigns(options) {
    return request("/api/designs", options);
  },

  /** GET /api/designs/:slug → { design: {...} } */
  getDesign(slug, options) {
    return request(`/api/designs/${encodeURIComponent(slug)}`, options);
  },

  /** POST /api/orders */
  createOrder(orderPayload, options) {
    return request("/api/orders", {
      method: "POST",
      body: orderPayload,
      ...(options || {}),
    });
  },

  /** GET /api/orders/:order_number → { order: {...} } */
  getOrder(orderNumber, options) {
    return request(`/api/orders/${encodeURIComponent(orderNumber)}`, options);
  },

  /** POST /api/contact */
  sendContactMessage(contactPayload, options) {
    return request("/api/contact", {
      method: "POST",
      body: contactPayload,
      ...(options || {}),
    });
  },
};