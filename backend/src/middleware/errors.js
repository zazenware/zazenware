// =============================================================================
// zazenware — middleware/errors.js
// =============================================================================
// Centralized error handling. Every error response has the same JSON shape:
//
//   { "error": { "code": "kebab_case", "message": "Plain English", "fields": [...] } }
//
// Routes throw, next(err), or return AppError; this middleware turns it into JSON.
// =============================================================================

/**
 * Operational error type. Routes throw this when input is invalid or a
 * known business rule fails. Internal/unknown errors are caught and
 * returned as a generic 500.
 */
export class AppError extends Error {
  constructor({ status = 400, code = "bad_request", message, fields }) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.isOperational = true;
  }
}

/** Convenience helpers for routes to throw. */
export const errors = {
  badRequest: (message, fields) =>
    new AppError({ status: 400, code: "bad_request", message, fields }),
  notFound: (message = "Resource not found") =>
    new AppError({ status: 404, code: "not_found", message }),
  conflict: (message) =>
    new AppError({ status: 409, code: "conflict", message }),
  validation: (message, fields) =>
    new AppError({ status: 422, code: "validation_failed", message, fields }),
  rateLimited: (message = "Too many requests") =>
    new AppError({ status: 429, code: "rate_limited", message }),
};

/** 404 fallback for unmatched routes. */
export function notFound(req, _res, next) {
  next(new AppError({
    status: 404,
    code: "not_found",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  }));
}

/** Final error handler. Always responds in the standard error envelope. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // CORS-rejected request from an unallowed origin
  if (err && err.message && err.message.startsWith("CORS:")) {
    return res.status(403).json({
      error: { code: "cors_forbidden", message: err.message },
    });
  }

  // Body parser rejected the payload (oversized, malformed JSON, etc.)
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "invalid_json", message: "Request body is not valid JSON." },
    });
  }
  if (err && err.type === "entity.too.large") {
    return res.status(413).json({
      error: { code: "payload_too_large", message: "Request body is too large." },
    });
  }

  // Known operational error
  if (err && err.isOperational) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.fields) body.error.fields = err.fields;
    return res.status(err.status || 500).json(body);
  }

  // Unknown error — log full detail, return generic 500
  console.error("[zw] Unhandled error:", err);
  return res.status(500).json({
    error: {
      code: "internal_error",
      message: "Something went wrong. Please try again.",
    },
  });
}
