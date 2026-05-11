/* ============================================================================
   zazenware — validation.js
   ----------------------------------------------------------------------------
   Pure validation functions used by both the Cart (checkout) and Contact
   forms. The backend re-validates everything on submit — this is for UX
   only, NEVER for authority.
   ============================================================================ */

/** Pragmatic RFC-5321 email regex. Matches the backend's CHECK constraint. */
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Canada Post postal code regex (matches DB CHECK in orders). */
export const POSTAL_CODE_REGEX =
  /^[A-CEGHJ-NPRSTVXY][0-9][A-CEGHJ-NPRSTV-Z] ?[0-9][A-CEGHJ-NPRSTV-Z][0-9]$/i;

/** Normalize a Canadian postal code: uppercase, single space after 3rd char. */
export function normalizePostalCode(value) {
  if (typeof value !== "string") return "";
  const cleaned = value.toUpperCase().replace(/\s+/g, "");
  if (cleaned.length === 6) return cleaned.slice(0, 3) + " " + cleaned.slice(3);
  return cleaned;
}

/** Validate the customer + shipping form on the Cart page. */
export function validateCheckout(fields) {
  const errors = {};

  // Customer name
  const name = (fields.customer_name || "").trim();
  if (!name) errors.customer_name = "Please enter your full name.";
  else if (name.length > 120) errors.customer_name = "Name must be 120 characters or fewer.";

  // Email
  const email = (fields.customer_email || "").trim();
  if (!email) errors.customer_email = "Please enter your email.";
  else if (email.length > 254) errors.customer_email = "Email must be 254 characters or fewer.";
  else if (!EMAIL_REGEX.test(email)) errors.customer_email = "That doesn't look like a valid email.";

  // Optional customer note
  const note = fields.customer_note || "";
  if (note.length > 500) errors.customer_note = "Note must be 500 characters or fewer.";

  // Shipping full name
  const sName = (fields.shipping_full_name || "").trim();
  if (!sName) errors.shipping_full_name = "Required.";
  else if (sName.length > 120) errors.shipping_full_name = "Maximum 120 characters.";

  // Shipping address line 1
  const line1 = (fields.shipping_address_line_1 || "").trim();
  if (!line1) errors.shipping_address_line_1 = "Required.";
  else if (line1.length > 200) errors.shipping_address_line_1 = "Maximum 200 characters.";

  // Optional line 2
  const line2 = (fields.shipping_address_line_2 || "").trim();
  if (line2.length > 200) errors.shipping_address_line_2 = "Maximum 200 characters.";

  // City
  const city = (fields.shipping_city || "").trim();
  if (!city) errors.shipping_city = "Required.";
  else if (city.length > 100) errors.shipping_city = "Maximum 100 characters.";

  // Province
  const province = (fields.shipping_province || "").trim().toUpperCase();
  if (!province) errors.shipping_province = "Select your province.";
  else if (!VALID_PROVINCES.includes(province)) errors.shipping_province = "Invalid province.";

  // Postal code
  const postal = normalizePostalCode(fields.shipping_postal_code || "");
  if (!postal) errors.shipping_postal_code = "Required.";
  else if (!POSTAL_CODE_REGEX.test(postal)) errors.shipping_postal_code = "Use Canadian format like K1A 0B1.";

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      customer_name: name,
      customer_email: email.toLowerCase(),
      customer_note: note.trim() || null,
      shipping_full_name: sName,
      shipping_address_line_1: line1,
      shipping_address_line_2: line2 || null,
      shipping_city: city,
      shipping_province: province,
      shipping_postal_code: postal,
      shipping_country: "CA",
    },
  };
}

const VALID_PROVINCES = [
  "ON","QC","BC","AB","MB","SK","NS","NB","NL","PE","YT","NT","NU",
];
