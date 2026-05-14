/* ============================================================================
   zazenware — contact-validation.js
   ----------------------------------------------------------------------------
   Pure validators for the Contact form. The backend re-validates everything;
   this is for UX only.
   ============================================================================ */

import { EMAIL_REGEX } from "./validation.js";

export const VALID_INQUIRY_TYPES = [
  { value: "order_question",                label: "Order question" },
  { value: "custom_design_inquiry",         label: "Custom design inquiry" },
  { value: "band_merch_inquiry",            label: "Band merch / local project inquiry" },
  { value: "print_existing_design_inquiry", label: "Print my existing design" },
  { value: "general_question",              label: "General question" },
];

const VALID_VALUES = new Set(VALID_INQUIRY_TYPES.map(t => t.value));

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const NAME_MAX    = 120;
const EMAIL_MAX   = 254;

/** Validate the contact form fields. */
export function validateContact(fields) {
  const errors = {};

  const name = (fields.name || "").trim();
  if (!name) errors.name = "Please enter your name.";
  else if (name.length > NAME_MAX) errors.name = `Name must be ${NAME_MAX} characters or fewer.`;

  const email = (fields.email || "").trim();
  if (!email) errors.email = "Please enter your email.";
  else if (email.length > EMAIL_MAX) errors.email = `Email must be ${EMAIL_MAX} characters or fewer.`;
  else if (!EMAIL_REGEX.test(email)) errors.email = "That doesn't look like a valid email.";

  const inquiryType = (fields.inquiry_type || "").trim();
  if (!inquiryType) errors.inquiry_type = "Please choose an inquiry type.";
  else if (!VALID_VALUES.has(inquiryType)) errors.inquiry_type = "Choose one of the listed inquiry types.";

  const message = (fields.message || "").trim();
  if (!message) errors.message = "Please write your message.";
  else if (message.length < MESSAGE_MIN) errors.message = `Message must be at least ${MESSAGE_MIN} characters.`;
  else if (message.length > MESSAGE_MAX) errors.message = `Message must be ${MESSAGE_MAX} characters or fewer.`;

  // Conditional permission for print-existing-design
  const permission = fields.has_artwork_permission === true
                  || fields.has_artwork_permission === "on"
                  || fields.has_artwork_permission === "true";
  if (inquiryType === "print_existing_design_inquiry" && !permission) {
    errors.has_artwork_permission = "Please confirm you have rights to the artwork.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    normalized: {
      name,
      email: email.toLowerCase(),
      inquiry_type: inquiryType,
      message,
      has_artwork_permission: permission,
    },
  };
}
