// =============================================================================
// zazenware — services/contact.service.js
// =============================================================================
// Validates and persists a contact form submission.
//
// Schema reference (Master Spec § 13.7):
//   contact_submissions table has CHECK constraints on inquiry_type,
//   status, email format, message length (10..2000), and a critical rule:
//   inquiry_type = 'print_existing_design_inquiry' REQUIRES
//   has_artwork_permission = TRUE.
//
// Spam protection (matches orders.service.js):
//   - zw_hp honeypot: must be empty
//   - zw_t time-trap: at least 3s since form load, no older than 24h
// =============================================================================

import { query } from "../lib/db.js";
import { errors } from "../middleware/errors.js";

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const VALID_INQUIRY_TYPES = new Set([
  "order_question",
  "custom_design_inquiry",
  "band_merch_inquiry",
  "print_existing_design_inquiry",
  "general_question",
]);

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const NAME_MAX    = 120;
const EMAIL_MAX   = 254;

const TIME_TRAP_MIN_MS  = 3000;
const TIME_TRAP_MAX_AGE = 24 * 60 * 60 * 1000;

/**
 * Create a contact submission. Validates input, inserts a row, returns
 * a minimal public DTO ({ id, created_at }).
 *
 * @param {object} input  Raw request body
 * @param {Date}   now    Injectable clock
 * @returns {Promise<{id:number, created_at:Date}>}
 */
export async function createContactSubmission(input, now = new Date()) {
  if (!input || typeof input !== "object") {
    throw errors.badRequest("Request body must be a JSON object.");
  }

  // ─── Spam checks (generic rejection, never disclose which trap fired) ──
  if (input.zw_hp && String(input.zw_hp).trim() !== "") {
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }

  const zwT = Number(input.zw_t);
  if (!Number.isFinite(zwT)) {
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }
  const age = now.getTime() - zwT;
  if (age < TIME_TRAP_MIN_MS || age > TIME_TRAP_MAX_AGE) {
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }

  // ─── Field validation ─────────────────────────────────────────────────
  const fieldErrors = [];
  const name = trimmedStr(input.name, 1, NAME_MAX, fieldErrors, "name");

  let email = trimmedStr(input.email, 1, EMAIL_MAX, fieldErrors, "email");
  if (email && !EMAIL_REGEX.test(email)) {
    fieldErrors.push("email");
    email = "";
  }
  email = email.toLowerCase();

  const inquiryType = typeof input.inquiry_type === "string" ? input.inquiry_type : "";
  if (!VALID_INQUIRY_TYPES.has(inquiryType)) {
    fieldErrors.push("inquiry_type");
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    fieldErrors.push("message");
  }

  // Permission checkbox: required true for print-existing-design inquiry
  const permission = input.has_artwork_permission === true || input.has_artwork_permission === "true";
  if (inquiryType === "print_existing_design_inquiry" && !permission) {
    fieldErrors.push("has_artwork_permission");
  }

  if (fieldErrors.length > 0) {
    throw errors.validation("Contact submission is invalid.", fieldErrors);
  }

  // ─── Insert ───────────────────────────────────────────────────────────
  const result = await query(
    `INSERT INTO contact_submissions
       (name, email, inquiry_type, message, has_artwork_permission)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [name, email, inquiryType, message, permission],
  );

  return result.rows[0];
}

// ─── helpers ─────────────────────────────────────────────────────────────

function trimmedStr(value, min, max, fieldErrors, key) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min || s.length > max) {
    fieldErrors.push(key);
    return "";
  }
  return s;
}
