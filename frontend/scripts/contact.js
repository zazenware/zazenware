/* ============================================================================
   zazenware — contact.js
   ----------------------------------------------------------------------------
   Mount the Contact page form. Responsibilities:
     - Render the form (name, email, inquiry type, message, conditional
       permission checkbox, honeypot, time-trap).
     - Show/hide the permission checkbox based on inquiry-type selection,
       and make it required only for "print my existing design".
     - On submit: validate, POST /api/contact, show success or error states.
   ============================================================================ */

import { ApiError } from "./api.js";
import { el } from "./format.js";
import { VALID_INQUIRY_TYPES, validateContact } from "./contact-validation.js";

const ENDPOINT = "/api/contact";

function getApiBase() {
  if (typeof window !== "undefined" && window.ZW_CONFIG?.apiBaseUrl) {
    return String(window.ZW_CONFIG.apiBaseUrl).replace(/\/$/, "");
  }
  return "http://localhost:4000";
}

const state = {
  formLoadedAt: Date.now(),
  isSubmitting: false,
  inquiryType: "",
};

// ─── Boot ───────────────────────────────────────────────────────────────
function mount() {
  const mountNode = document.getElementById("contact-form-mount");
  if (!mountNode) return;
  mountNode.innerHTML = "";
  mountNode.append(renderForm());
}

// ─── Form ───────────────────────────────────────────────────────────────
function renderForm() {
  // Permission row (rendered, conditionally shown via .hidden)
  const permissionRow = el("div", {
    class: "zw-field zw-field--checkbox",
    id: "permission-row",
    hidden: true,
  }, [
    el("label", { class: "zw-field__checkbox-label" }, [
      el("input", {
        type: "checkbox",
        id: "f_has_artwork_permission",
        name: "has_artwork_permission",
        class: "zw-field__checkbox",
      }),
      " I confirm I have full rights or permission to print this artwork. *",
    ]),
    el("p", {
      class: "zw-field__helper",
      id: "help_has_artwork_permission",
    }, [
      "If you don't own the artwork, please get written permission from the artist before submitting.",
    ]),
    el("p", { class: "zw-field__error", id: "err_has_artwork_permission", hidden: true }),
  ]);

  // Inquiry type select
  const inquirySelect = el(
    "select",
    {
      id: "f_inquiry_type",
      name: "inquiry_type",
      class: "zw-field__input",
      required: true,
      onChange: (e) => {
        state.inquiryType = e.target.value;
        const showPerm = state.inquiryType === "print_existing_design_inquiry";
        permissionRow.hidden = !showPerm;
        const checkbox = permissionRow.querySelector("#f_has_artwork_permission");
        if (checkbox) checkbox.required = showPerm;
      },
    },
    [
      el("option", { value: "" }, ["Select inquiry type…"]),
      ...VALID_INQUIRY_TYPES.map(t =>
        el("option", { value: t.value }, [t.label]),
      ),
    ],
  );

  const form = el(
    "form",
    {
      id: "contact-form",
      class: "zw-contact-form zw-stack",
      novalidate: "",
      onSubmit: (e) => { e.preventDefault(); handleSubmit(form); },
    },
    [
      el("div", {
        id: "contact-error-summary",
        role: "alert",
        "aria-live": "assertive",
        class: "zw-checkout-form__summary",
        hidden: true,
      }),

      el("div", {
        id: "contact-success",
        role: "status",
        "aria-live": "polite",
        class: "zw-contact-form__success",
        hidden: true,
      }),

      field("name", "Your name *", { type: "text", required: true, autocomplete: "name", maxlength: 120 }),
      field("email", "Email *", { type: "email", required: true, autocomplete: "email", maxlength: 254 }),

      el("div", { class: "zw-field" }, [
        el("label", { for: "f_inquiry_type", class: "zw-field__label" }, ["Inquiry type *"]),
        inquirySelect,
        el("p", { class: "zw-field__error", id: "err_inquiry_type", hidden: true }),
      ]),

      // Conditional permission checkbox (shown only when print-existing-design selected)
      permissionRow,

      field("message", "Your message *", {
        type: "textarea",
        required: true,
        maxlength: 2000,
        helper: "10 to 2,000 characters.",
      }),

      // Honeypot — visually hidden, server-validated
      el("div", { class: "zw-honeypot", "aria-hidden": "true" }, [
        el("label", { for: "zw_hp" }, ["Leave this field empty"]),
        el("input", { type: "text", id: "zw_hp", name: "zw_hp", tabindex: "-1", autocomplete: "off", value: "" }),
      ]),

      // Time-trap
      el("input", { type: "hidden", id: "zw_t", name: "zw_t", value: String(state.formLoadedAt) }),

      el("div", { class: "zw-cluster", style: "margin-top: var(--zw-space-4);" }, [
        el("button", {
          type: "submit",
          class: "zw-btn zw-btn--primary zw-btn--large",
          id: "send-message-btn",
        }, ["Send message"]),
      ]),

      el("p", { class: "zw-text-muted zw-text-small" }, [
        "Replies come from ",
        el("strong", {}, ["contact@zazenware.com"]),
        ". I read everything and reply as quickly as I can.",
      ]),
    ],
  );

  return form;
}

function field(name, label, opts = {}) {
  const id = "f_" + name;
  const errorId = "err_" + name;
  const helperId = opts.helper ? "help_" + name : null;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || null;

  const inputAttrs = {
    id, name,
    class: "zw-field__input",
    "aria-describedby": describedBy,
  };
  if (opts.required)     inputAttrs.required = true;
  if (opts.autocomplete) inputAttrs.autocomplete = opts.autocomplete;
  if (opts.maxlength)    inputAttrs.maxlength = String(opts.maxlength);

  let inputEl;
  if (opts.type === "textarea") {
    inputEl = el("textarea", { ...inputAttrs, rows: "6" });
  } else {
    inputEl = el("input", { ...inputAttrs, type: opts.type || "text" });
  }

  return el("div", { class: "zw-field" }, [
    el("label", { for: id, class: "zw-field__label" }, [label]),
    inputEl,
    opts.helper
      ? el("p", { class: "zw-field__helper", id: helperId }, [opts.helper])
      : null,
    el("p", { class: "zw-field__error", id: errorId, hidden: true }),
  ]);
}

// ─── Submit ─────────────────────────────────────────────────────────────
async function handleSubmit(form) {
  if (state.isSubmitting) return;

  // Clear previous errors + success banner
  form.querySelectorAll(".zw-field__error").forEach((e) => { e.hidden = true; e.textContent = ""; });
  form.querySelectorAll(".zw-field__input, .zw-field__checkbox").forEach((i) => i.removeAttribute("aria-invalid"));
  const summary = form.querySelector("#contact-error-summary");
  summary.hidden = true; summary.innerHTML = "";
  const success = form.querySelector("#contact-success");
  success.hidden = true; success.innerHTML = "";

  const fd = new FormData(form);
  const fields = {
    name: fd.get("name"),
    email: fd.get("email"),
    inquiry_type: fd.get("inquiry_type"),
    message: fd.get("message"),
    has_artwork_permission: form.querySelector("#f_has_artwork_permission")?.checked || false,
    zw_hp: fd.get("zw_hp") || "",
    zw_t: Number(fd.get("zw_t")) || 0,
  };

  const { isValid, errors, normalized } = validateContact(fields);

  if (!isValid) {
    showFieldErrors(form, errors);
    showSummary(summary, errors);
    return;
  }

  const payload = {
    ...normalized,
    zw_hp: fields.zw_hp,
    zw_t: fields.zw_t,
  };

  const btn = form.querySelector("#send-message-btn");
  state.isSubmitting = true;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Sending…";

  try {
    await postContact(payload);

    // Success
    success.innerHTML = "";
    success.append(
      el("strong", {}, ["Message sent."]),
      el("p", { style: "margin: var(--zw-space-2) 0 0;" }, [
        "Thanks for reaching out. I'll get back to you as soon as I can.",
      ]),
    );
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "start" });

    // Reset the form so user can send another if they want
    form.reset();
    state.inquiryType = "";
    const permRow = form.querySelector("#permission-row");
    if (permRow) permRow.hidden = true;
  } catch (err) {
    console.error("[zw] Contact submit failed:", err);

    if (err instanceof ApiError && Array.isArray(err.fields) && err.fields.length > 0) {
      const fieldErrs = {};
      for (const f of err.fields) fieldErrs[f] = err.message || "Invalid.";
      showFieldErrors(form, fieldErrs);
    }
    showSummary(summary, { _form: err.message || "Couldn't send your message. Please try again." });
  } finally {
    state.isSubmitting = false;
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = "Send message";
  }
}

async function postContact(payload) {
  const url = getApiBase() + ENDPOINT;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  }

  let data = null;
  try { data = await res.json(); } catch (_) {}

  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError({
      status: res.status,
      code: err.code || "http_" + res.status,
      message: err.message || res.statusText || "Send failed.",
      fields: err.fields,
    });
  }

  return data;
}

function showFieldErrors(form, errors) {
  let firstInvalid = null;
  for (const [field, msg] of Object.entries(errors)) {
    if (field === "_form") continue;
    const err = form.querySelector("#err_" + field);
    const input = form.querySelector("#f_" + field);
    if (err) { err.hidden = false; err.textContent = msg; }
    if (input) {
      input.setAttribute("aria-invalid", "true");
      if (!firstInvalid) firstInvalid = input;
    }
  }
  if (firstInvalid) firstInvalid.focus();
}

function showSummary(summary, errors) {
  if (!summary) return;
  const list = el("ul", { class: "zw-checkout-form__summary-list" });
  const items = Object.values(errors).filter(Boolean);
  if (items.length === 0) return;
  for (const msg of items) list.append(el("li", {}, [msg]));
  summary.append(
    el("strong", {}, ["Please fix the following:"]),
    list,
  );
  summary.hidden = false;
  summary.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Boot ───────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
