/* ============================================================================
   zazenware — cart-page.js
   ----------------------------------------------------------------------------
   Mount the Cart page. Responsibilities:
     - Render cart line items from localStorage.
     - Render order summary block with live math preview.
     - Render checkout form.
     - On submit: validate, then POST to /api/orders through checkout.js.
   ============================================================================ */

import {
  readCart,
  updateQuantity,
  removeLine,
  clearCart,
} from "./cart.js";

import { breakdown, VALID_PROVINCES } from "./cart-math.js";
import { validateCheckout, normalizePostalCode } from "./validation.js";
import { el, formatMoney, clampInt } from "./format.js";
import { submitAndRedirect } from "./checkout.js";

const PROVINCE_LABELS = {
  ON: "Ontario",
  QC: "Quebec",
  BC: "British Columbia",
  AB: "Alberta",
  MB: "Manitoba",
  SK: "Saskatchewan",
  NS: "Nova Scotia",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  PE: "Prince Edward Island",
  YT: "Yukon",
  NT: "Northwest Territories",
  NU: "Nunavut",
};

const state = {
  province: "",
  formLoadedAt: Date.now(),
  isSubmitting: false,
};

// ─── Boot ───────────────────────────────────────────────────────────────

function mount() {
  refreshAll();
  document.addEventListener("zw:cart-updated", refreshAll);
}

function refreshAll() {
  const snapshot = getCheckoutSnapshot();
  const cart = readCart();

  renderEmptyOrFilled(cart);
  restoreCheckoutSnapshot(snapshot);
}

// ─── Form snapshot preservation ─────────────────────────────────────────

function getCheckoutSnapshot() {
  const form = document.getElementById("checkout-form");
  if (!form) return {};

  const fd = new FormData(form);
  const snapshot = Object.fromEntries(fd.entries());

  // Never preserve anti-spam fields.
  delete snapshot.zw_hp;
  delete snapshot.zw_t;

  return snapshot;
}

function restoreCheckoutSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;

  for (const [name, value] of Object.entries(snapshot)) {
    const selector = `[name="${cssEscape(name)}"]`;
    const field = document.querySelector(selector);

    if (!field) continue;
    field.value = value;
  }
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") {
    return window.CSS.escape(value);
  }

  return String(value).replace(/"/g, '\\"');
}

// ─── Empty vs filled ────────────────────────────────────────────────────

function renderEmptyOrFilled(cart) {
  const empty = document.getElementById("cart-empty");
  const items = document.getElementById("cart-items");
  const summary = document.getElementById("cart-summary");

  if (!empty || !items || !summary) return;

  if (cart.length === 0) {
    empty.hidden = false;
    items.hidden = true;
    summary.hidden = true;
    items.innerHTML = "";
    summary.innerHTML = "";
    return;
  }

  empty.hidden = true;
  items.hidden = false;
  summary.hidden = false;

  renderItems(items, cart);
  renderSummary(summary, cart);
}

// ─── Cart items ─────────────────────────────────────────────────────────

function renderItems(container, cart) {
  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 2rem;" }, ["your cart"]),
  );

  const list = el("ul", { class: "zw-cart-items", role: "list" });

  cart.forEach((line, index) => {
    list.append(renderCartItem(line, index));
  });

  container.append(list);

  container.append(
    el("div", { class: "zw-cluster", style: "margin-top: var(--zw-space-4);" }, [
      el("button", {
        type: "button",
        class: "zw-btn zw-btn--ghost zw-btn--small",
        onClick: () => {
          if (confirm("Empty your cart?")) clearCart();
        },
      }, ["Clear cart"]),
    ]),
  );
}

function renderCartItem(line, index) {
  const optionText = line.product_type === "shirt"
    ? `Size: ${line.size} · Colour: ${line.color}`
    : "";

  const lineTotal = line.unit_price_cents * line.quantity;

  const qtyInput = el("input", {
    type: "number",
    min: "1",
    max: "99",
    step: "1",
    value: String(line.quantity),
    "aria-label": `Quantity of ${line.name}`,
    class: "zw-cart-item__qty-input",
    onChange: (event) => {
      const n = clampInt(event.target.value, 1, 99);
      event.target.value = String(n);
      updateQuantity(index, n);
    },
  });

  return el("li", { class: "zw-cart-item" }, [
    el("div", { class: "zw-cart-item__image zw-img-frame zw-aspect-square" }, [
      el("img", {
        src: line.image_url || "",
        alt: "",
        loading: "lazy",
        decoding: "async",
      }),
    ]),

    el("div", { class: "zw-cart-item__body zw-stack-sm" }, [
      el("h3", { class: "zw-cart-item__title" }, [line.name]),
      optionText
        ? el("p", { class: "zw-cart-item__meta zw-text-muted zw-text-small" }, [optionText])
        : null,
      el("p", { class: "zw-cart-item__price" }, [
        formatMoney(line.unit_price_cents),
        " each",
      ]),
    ]),

    el("div", { class: "zw-cart-item__qty zw-cluster zw-cluster-sm" }, [
      el("button", {
        type: "button",
        class: "zw-btn zw-btn--small",
        "aria-label": `Decrease quantity of ${line.name}`,
        onClick: () => updateQuantity(index, line.quantity - 1),
      }, ["−"]),

      qtyInput,

      el("button", {
        type: "button",
        class: "zw-btn zw-btn--small",
        "aria-label": `Increase quantity of ${line.name}`,
        onClick: () => updateQuantity(index, line.quantity + 1),
      }, ["+"]),
    ]),

    el("div", { class: "zw-cart-item__total" }, [
      el("strong", {}, [formatMoney(lineTotal)]),
    ]),

    el("div", { class: "zw-cart-item__remove" }, [
      el("button", {
        type: "button",
        class: "zw-btn zw-btn--danger zw-btn--small",
        "aria-label": `Remove ${line.name} from cart`,
        onClick: () => {
          if (line.quantity > 1) {
            const ok = confirm(`Remove all ${line.quantity} × ${line.name}?`);
            if (!ok) return;
          }

          removeLine(index);
        },
      }, ["Remove"]),
    ]),
  ]);
}

// ─── Summary + form ─────────────────────────────────────────────────────

function renderSummary(container, cart) {
  const b = breakdown(cart, state.province);

  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 2rem;" }, ["order summary"]),
  );

  const summaryRows = [
    line("Subtotal", formatMoney(b.subtotal_cents)),

    b.has_bundle
      ? line(
          "Bundle discount (shirt + patch + print)",
          "−" + formatMoney(b.bundle_discount_cents),
        )
      : null,

    line(
      "Shipping",
      b.shipping_cents === null
        ? "Select province below"
        : b.shipping_cents === 0
          ? "Free in Ontario"
          : formatMoney(b.shipping_cents),
    ),

    line(
      "HST (13%)",
      b.tax_cents === null ? "—" : formatMoney(b.tax_cents),
    ),

    line(
      "Estimated total",
      b.total_cents === null ? "—" : formatMoney(b.total_cents),
      { strong: true },
    ),
  ].filter(Boolean);

  container.append(el("dl", { class: "zw-order-summary" }, summaryRows));

  container.append(
    el("p", { class: "zw-text-muted zw-text-small" }, [
      "Final total is confirmed when you submit your order.",
    ]),
  );

  container.append(renderCheckoutForm());
}

function line(label, value, { strong = false } = {}) {
  return el(
    "div",
    {
      class: "zw-order-summary__line" +
        (strong ? " zw-order-summary__total" : ""),
    },
    [
      el("dt", {}, [label]),
      el("dd", {}, [strong ? el("strong", {}, [value]) : value]),
    ],
  );
}

// ─── Checkout form ──────────────────────────────────────────────────────

function renderCheckoutForm() {
  const provinceSelect = el(
    "select",
    {
      id: "f_shipping_province",
      name: "shipping_province",
      class: "zw-field__input",
      required: true,
      onChange: (event) => {
        state.province = event.target.value;
        refreshAll();
      },
    },
    [
      el("option", { value: "" }, ["Select province…"]),
      ...VALID_PROVINCES.map((province) =>
        el(
          "option",
          state.province === province
            ? { value: province, selected: true }
            : { value: province },
          [`${province} — ${PROVINCE_LABELS[province]}`],
        ),
      ),
    ],
  );

  const form = el(
    "form",
    {
      id: "checkout-form",
      class: "zw-checkout-form zw-stack",
      novalidate: "",
      onSubmit: (event) => {
        event.preventDefault();
        handleSubmit(form);
      },
    },
    [
      el("div", {
        id: "form-error-summary",
        role: "alert",
        "aria-live": "assertive",
        class: "zw-checkout-form__summary",
        hidden: true,
      }),

      el("h3", { class: "zw-display", style: "font-size: 1.5rem;" }, ["your details"]),

      field("customer_name", "Full name *", {
        type: "text",
        required: true,
        autocomplete: "name",
        maxlength: 120,
      }),

      field("customer_email", "Email *", {
        type: "email",
        required: true,
        autocomplete: "email",
        maxlength: 254,
      }),

      field("customer_note", "Order note (optional)", {
        type: "textarea",
        maxlength: 500,
        helper: "Anything we should know? 500 characters max.",
      }),

      el("h3", { class: "zw-display", style: "font-size: 1.5rem;" }, ["shipping address"]),

      el("p", { class: "zw-text-muted zw-text-small" }, [
        "Canada only. Country is fixed to CA.",
      ]),

      field("shipping_full_name", "Recipient name *", {
        type: "text",
        required: true,
        autocomplete: "shipping name",
        maxlength: 120,
      }),

      field("shipping_address_line_1", "Address line 1 *", {
        type: "text",
        required: true,
        autocomplete: "shipping address-line1",
        maxlength: 200,
      }),

      field("shipping_address_line_2", "Address line 2", {
        type: "text",
        autocomplete: "shipping address-line2",
        maxlength: 200,
        helper: "Apt, unit, suite (optional).",
      }),

      field("shipping_city", "City *", {
        type: "text",
        required: true,
        autocomplete: "shipping address-level2",
        maxlength: 100,
      }),

      el("div", { class: "zw-field" }, [
        el("label", { for: "f_shipping_province", class: "zw-field__label" }, [
          "Province *",
        ]),
        provinceSelect,
        el("p", {
          class: "zw-field__error",
          id: "err_shipping_province",
          hidden: true,
        }),
      ]),

      field("shipping_postal_code", "Postal code *", {
        type: "text",
        required: true,
        autocomplete: "shipping postal-code",
        maxlength: 7,
        helper: "Canadian format, e.g. K1A 0B1.",
        onBlur: (event) => {
          event.target.value = normalizePostalCode(event.target.value);
        },
      }),

      el("div", { class: "zw-honeypot", "aria-hidden": "true" }, [
        el("label", { for: "zw_hp" }, ["Leave this field empty"]),
        el("input", {
          type: "text",
          id: "zw_hp",
          name: "zw_hp",
          tabindex: "-1",
          autocomplete: "off",
          value: "",
        }),
      ]),

      el("input", {
        type: "hidden",
        id: "zw_t",
        name: "zw_t",
        value: String(state.formLoadedAt),
      }),

      el("div", { class: "zw-cluster", style: "margin-top: var(--zw-space-5);" }, [
        el("button", {
          type: "submit",
          class: "zw-btn zw-btn--primary zw-btn--large",
          id: "place-order-btn",
        }, ["Place order"]),

        el("a", {
          href: "/shop.html",
          class: "zw-btn zw-btn--secondary",
        }, ["Keep shopping"]),
      ]),

      el("p", { class: "zw-text-muted zw-text-small" }, [
        "Submitting this form records your order. Payment is by Interac e-transfer to ",
        el("strong", {}, ["payments@zazenware.com"]),
        " after submission.",
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
    id,
    name,
    class: "zw-field__input",
  };

  if (describedBy) inputAttrs["aria-describedby"] = describedBy;
  if (opts.required) inputAttrs.required = true;
  if (opts.autocomplete) inputAttrs.autocomplete = opts.autocomplete;
  if (opts.maxlength) inputAttrs.maxlength = String(opts.maxlength);
  if (opts.onBlur) inputAttrs.onBlur = opts.onBlur;

  const inputEl = opts.type === "textarea"
    ? el("textarea", { ...inputAttrs, rows: "3" })
    : el("input", { ...inputAttrs, type: opts.type || "text" });

  return el("div", { class: "zw-field" }, [
    el("label", { for: id, class: "zw-field__label" }, [label]),
    inputEl,

    opts.helper
      ? el("p", { class: "zw-field__helper", id: helperId }, [opts.helper])
      : null,

    el("p", {
      class: "zw-field__error",
      id: errorId,
      hidden: true,
    }),
  ]);
}

// ─── Submit ─────────────────────────────────────────────────────────────

async function handleSubmit(form) {
  if (state.isSubmitting) return;

  clearFormErrors(form);

  const summary = form.querySelector("#form-error-summary");
  const fd = new FormData(form);
  const fields = Object.fromEntries(fd.entries());

  const { isValid, errors, normalized } = validateCheckout(fields);

  if (!isValid) {
    showFieldErrors(form, errors);
    showSummary(summary, errors);
    return;
  }

  const cart = readCart();

  if (cart.length === 0) {
    showSummary(summary, { _form: "Your cart is empty." });
    return;
  }

  const payload = {
    customer_name: normalized.customer_name,
    customer_email: normalized.customer_email,
    customer_note: normalized.customer_note,

    shipping_full_name: normalized.shipping_full_name,
    shipping_address_line_1: normalized.shipping_address_line_1,
    shipping_address_line_2: normalized.shipping_address_line_2,
    shipping_city: normalized.shipping_city,
    shipping_province: normalized.shipping_province,
    shipping_postal_code: normalized.shipping_postal_code,
    shipping_country: "CA",

    items: cart.map((line) => ({
      product_id: line.product_id,
      product_type: line.product_type,
      design_slug: line.design_slug,
      quantity: line.quantity,
      ...(line.product_type === "shirt"
        ? { size: line.size, color: line.color }
        : {}),
    })),

    zw_hp: fields.zw_hp || "",
    zw_t: Number(fields.zw_t) || 0,
  };

  const btn = form.querySelector("#place-order-btn");

  state.isSubmitting = true;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.textContent = "Submitting…";

  try {
    await submitAndRedirect(payload);

    // If checkout.js redirects before resolving, this may never visibly matter.
    // If it resolves first, this keeps local cart state clean.
    clearCart();
  } catch (err) {
    if (Array.isArray(err.fields) && err.fields.length > 0) {
      const fieldErrors = {};

      for (const fieldName of err.fields) {
        fieldErrors[fieldName] = err.message || "Invalid.";
      }

      showFieldErrors(form, fieldErrors);
    }

    showSummary(summary, {
      _form: err.message || "Order submission failed.",
    });

    state.isSubmitting = false;
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.textContent = "Place order";
  }
}

function clearFormErrors(form) {
  form.querySelectorAll(".zw-field__error").forEach((error) => {
    error.hidden = true;
    error.textContent = "";
  });

  form.querySelectorAll(".zw-field__input").forEach((input) => {
    input.removeAttribute("aria-invalid");
  });

  const summary = form.querySelector("#form-error-summary");
  if (summary) {
    summary.hidden = true;
    summary.innerHTML = "";
  }
}

function showFieldErrors(form, errors) {
  let firstInvalid = null;

  for (const [fieldName, message] of Object.entries(errors)) {
    if (fieldName === "_form") continue;

    const error = form.querySelector("#err_" + cssEscape(fieldName));
    const input = form.querySelector("#f_" + cssEscape(fieldName));

    if (error) {
      error.hidden = false;
      error.textContent = message;
    }

    if (input) {
      input.setAttribute("aria-invalid", "true");
      if (!firstInvalid) firstInvalid = input;
    }
  }

  if (firstInvalid) firstInvalid.focus();
}

function showSummary(summary, errors) {
  if (!summary) return;

  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) return;

  const list = el("ul", { class: "zw-checkout-form__summary-list" });

  for (const message of messages) {
    list.append(el("li", {}, [message]));
  }

  summary.innerHTML = "";
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