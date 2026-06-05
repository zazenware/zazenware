/* ============================================================================
   zazenware — validation.js
   ----------------------------------------------------------------------------
   Pure validation functions used by frontend forms.

   Authority rule:
   - Frontend validation is UX only.
   - The backend must re-validate every submitted field.
   ============================================================================ */

import { VALID_PROVINCES } from "./cart-math.js";

/** Pragmatic RFC-5321-ish email regex. */
export const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Canada Post postal code regex. */
export const POSTAL_CODE_REGEX =
  /^[A-CEGHJ-NPRSTVXY][0-9][A-CEGHJ-NPRSTV-Z] ?[0-9][A-CEGHJ-NPRSTV-Z][0-9]$/i;

/** Normalize a Canadian postal code: uppercase, single space after 3rd char. */
export function normalizePostalCode(value) {
  const cleaned = stringValue(value).toUpperCase().replace(/\s+/g, "");

  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

  return cleaned;
}

/** Validate the customer + shipping form on the Cart page. */
export function validateCheckout(fields = {}) {
  const errors = {};

  const customerName = clean(fields.customer_name);
  const customerEmail = clean(fields.customer_email).toLowerCase();
  const customerNote = clean(fields.customer_note);

  const shippingFullName = clean(fields.shipping_full_name);
  const shippingAddress1 = clean(fields.shipping_address_line_1);
  const shippingAddress2 = clean(fields.shipping_address_line_2);
  const shippingCity = clean(fields.shipping_city);
  const shippingProvince = clean(fields.shipping_province).toUpperCase();
  const shippingPostalCode = normalizePostalCode(fields.shipping_postal_code);

  // Customer name
  if (!customerName) {
    errors.customer_name = "Please enter your full name.";
  } else if (customerName.length > 120) {
    errors.customer_name = "Name must be 120 characters or fewer.";
  }

  // Email
  if (!customerEmail) {
    errors.customer_email = "Please enter your email.";
  } else if (customerEmail.length > 254) {
    errors.customer_email = "Email must be 254 characters or fewer.";
  } else if (!EMAIL_REGEX.test(customerEmail)) {
    errors.customer_email = "That doesn't look like a valid email.";
  }

  // Optional customer note
  if (customerNote.length > 500) {
    errors.customer_note = "Note must be 500 characters or fewer.";
  }

  // Shipping full name
  if (!shippingFullName) {
    errors.shipping_full_name = "Required.";
  } else if (shippingFullName.length > 120) {
    errors.shipping_full_name = "Maximum 120 characters.";
  }

  // Shipping address line 1
  if (!shippingAddress1) {
    errors.shipping_address_line_1 = "Required.";
  } else if (shippingAddress1.length > 200) {
    errors.shipping_address_line_1 = "Maximum 200 characters.";
  }

  // Optional line 2
  if (shippingAddress2.length > 200) {
    errors.shipping_address_line_2 = "Maximum 200 characters.";
  }

  // City
  if (!shippingCity) {
    errors.shipping_city = "Required.";
  } else if (shippingCity.length > 100) {
    errors.shipping_city = "Maximum 100 characters.";
  }

  // Province
  if (!shippingProvince) {
    errors.shipping_province = "Select your province.";
  } else if (!VALID_PROVINCES.includes(shippingProvince)) {
    errors.shipping_province = "Invalid province.";
  }

  // Postal code
  if (!shippingPostalCode) {
    errors.shipping_postal_code = "Required.";
  } else if (!POSTAL_CODE_REGEX.test(shippingPostalCode)) {
    errors.shipping_postal_code = "Use Canadian format like K1A 0B1.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      customer_name: customerName,
      customer_email: customerEmail,
      customer_note: customerNote || null,

      shipping_full_name: shippingFullName,
      shipping_address_line_1: shippingAddress1,
      shipping_address_line_2: shippingAddress2 || null,
      shipping_city: shippingCity,
      shipping_province: shippingProvince,
      shipping_postal_code: shippingPostalCode,
      shipping_country: "CA",
    },
  };
}

/**
 * Optional contact form validator.
 * Safe to keep even if contact.js does not use it yet.
 */
export function validateContact(fields = {}) {
  const errors = {};

  const name = clean(fields.name ?? fields.contact_name);
  const email = clean(fields.email ?? fields.contact_email).toLowerCase();
  const subject = clean(fields.subject ?? fields.contact_subject);
  const message = clean(fields.message ?? fields.contact_message);
  const company = clean(fields.company ?? fields.band_name ?? fields.contact_company);

  if (!name) {
    errors.name = "Please enter your name.";
    errors.contact_name = "Please enter your name.";
  } else if (name.length > 120) {
    errors.name = "Name must be 120 characters or fewer.";
    errors.contact_name = "Name must be 120 characters or fewer.";
  }

  if (!email) {
    errors.email = "Please enter your email.";
    errors.contact_email = "Please enter your email.";
  } else if (email.length > 254) {
    errors.email = "Email must be 254 characters or fewer.";
    errors.contact_email = "Email must be 254 characters or fewer.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "That doesn't look like a valid email.";
    errors.contact_email = "That doesn't look like a valid email.";
  }

  if (subject.length > 160) {
    errors.subject = "Subject must be 160 characters or fewer.";
    errors.contact_subject = "Subject must be 160 characters or fewer.";
  }

  if (!message) {
    errors.message = "Please enter a message.";
    errors.contact_message = "Please enter a message.";
  } else if (message.length > 2000) {
    errors.message = "Message must be 2000 characters or fewer.";
    errors.contact_message = "Message must be 2000 characters or fewer.";
  }

  if (company.length > 160) {
    errors.company = "This field must be 160 characters or fewer.";
    errors.contact_company = "This field must be 160 characters or fewer.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      name,
      email,
      subject: subject || null,
      message,
      company: company || null,
    },
  };
}

// ─── Private helpers ────────────────────────────────────────────────────

function stringValue(value) {
  return String(value ?? "");
}

function clean(value) {
  return stringValue(value).trim();
}