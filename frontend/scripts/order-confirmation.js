/* ============================================================================
   zazenware — order-confirmation.js
   ----------------------------------------------------------------------------
   Mount the Order Confirmation page.

   Responsibilities:
     1. Read ?order= from the URL.
     2. Validate the format client-side.
     3. Fetch GET /api/orders/:order_number through api.js.
     4. Render the order number, item list, totals, payment instructions,
        and any non-pending status note.
   ============================================================================ */

import { api, ApiError } from "./api.js";
import { el, formatMoney } from "./format.js";

const ORDER_NUMBER_REGEX = /^ZW-\d{4}-\d{6}$/;
const PAYMENTS_EMAIL = "payments@zazenware.com";
const CONTACT_EMAIL = "contact@zazenware.com";

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

// ─── Boot / mount ───────────────────────────────────────────────────────

async function mount() {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = clean(params.get("order"));

  renderHeaderNumber(orderNumber);

  const detailsEl = document.getElementById("order-details");
  if (!detailsEl) return;

  if (!orderNumber) {
    renderInfoPanel(
      detailsEl,
      "No order number was provided.",
      `If you just placed an order, please check your email for the order number, or message ${CONTACT_EMAIL}.`,
    );
    return;
  }

  if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
    renderInfoPanel(
      detailsEl,
      "That order number isn't in the expected format.",
      `Order numbers look like ZW-2026-000123. If you have your order confirmation email, paste the exact number from there. Otherwise message ${CONTACT_EMAIL}.`,
    );
    return;
  }

  renderLoading(detailsEl);

  try {
    const response = await api.getOrder(orderNumber);
    const order = normalizeOrderResponse(response);

    if (!order) {
      throw new Error("The server response did not include order details.");
    }

    renderHeaderNumber(order.order_number || orderNumber);
    renderOrder(detailsEl, order);
  } catch (err) {
    console.error("[zw] Failed to fetch order:", err);
    renderFetchError(detailsEl, err);
  }
}

// ─── Header order number ────────────────────────────────────────────────

function renderHeaderNumber(orderNumber) {
  const target = document.getElementById("order-number");
  if (!target) return;

  if (orderNumber && ORDER_NUMBER_REGEX.test(orderNumber)) {
    target.textContent = orderNumber;
    target.style.color = "";
    document.title = `${orderNumber} — Order confirmation — zazenware`;
    return;
  }

  if (orderNumber) {
    target.textContent = orderNumber;
    target.style.color = "var(--zw-error)";
    return;
  }

  target.textContent = "(no order number)";
  target.style.color = "var(--zw-text-muted)";
}

// ─── States ─────────────────────────────────────────────────────────────

function renderLoading(container) {
  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 1.5rem;" }, ["order details"]),
    el("p", { class: "zw-text-muted", "aria-busy": "true" }, ["Loading order…"]),
  );
}

function renderInfoPanel(container, headline, body) {
  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 1.5rem;" }, [headline]),
    el("p", {}, [body]),
    el("p", { style: "margin-top: var(--zw-space-3);" }, [
      el("a", { href: "/", class: "zw-btn zw-btn--secondary" }, ["Back to home"]),
    ]),
  );
}

function renderErrorPanel(container, message) {
  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 1.5rem;" }, ["couldn't load order"]),
    el("p", { class: "zw-status zw-status--error" }, [
      message || "Something went wrong reaching the server.",
    ]),
    el("p", { style: "margin-top: var(--zw-space-3);" }, [
      el("button", {
        type: "button",
        class: "zw-btn zw-btn--secondary",
        onClick: () => mount(),
      }, ["Retry"]),
    ]),
  );
}

function renderFetchError(container, err) {
  if (err instanceof ApiError && err.status === 404) {
    renderInfoPanel(
      container,
      "Order not found.",
      `If you just submitted your order, give the page a few seconds and refresh. If you keep seeing this, message ${CONTACT_EMAIL} with this order number.`,
    );
    return;
  }

  if (err instanceof ApiError && err.status === 400) {
    renderInfoPanel(
      container,
      "We couldn't read that order number.",
      err.message || "Order numbers look like ZW-2026-000123.",
    );
    return;
  }

  renderErrorPanel(container, err?.message);
}

// ─── Successful render ──────────────────────────────────────────────────

function renderOrder(container, order) {
  container.innerHTML = "";

  container.append(
    el("h2", { class: "zw-display", style: "font-size: 1.5rem;" }, ["order details"]),
    renderItemsList(order.items),
  );

  container.append(
    el("h3", {
      class: "zw-display",
      style: "font-size: 1.25rem; margin-top: var(--zw-space-5);",
    }, ["totals"]),
    renderSummary(order),
  );

  container.append(renderPaymentInstructions(order));

  const statusNote = renderStatusNote(order.status);
  if (statusNote) container.append(statusNote);
}

// ─── Items ──────────────────────────────────────────────────────────────

function renderItemsList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return el("p", { class: "zw-text-muted" }, ["No items recorded for this order."]);
  }

  const list = el("ul", { class: "zw-confirm-items", role: "list" });

  for (const item of items) {
    list.append(renderItem(item));
  }

  return list;
}

function renderItem(item) {
  const quantity = positiveInt(item.quantity, 1);
  const unitPrice = cents(item.unit_price_cents);
  const lineTotal = item.line_total_cents == null
    ? unitPrice * quantity
    : cents(item.line_total_cents);

  const productName =
    clean(item.product_name) ||
    clean(item.name) ||
    clean(item.design_name) ||
    "Item";

  const optionText = item.product_type === "shirt" && item.size && item.color
    ? `Size: ${item.size} · Colour: ${item.color}`
    : "";

  const bodyChildren = [
    el("h4", { class: "zw-confirm-item__title" }, [productName]),

    optionText
      ? el("p", { class: "zw-text-muted zw-text-small" }, [optionText])
      : null,

    el("p", { class: "zw-text-small" }, [
      `${quantity} × ${formatMoney(unitPrice)} = `,
      el("strong", {}, [formatMoney(lineTotal)]),
    ]),
  ].filter(Boolean);

  return el("li", { class: "zw-confirm-item" }, [
    el("div", { class: "zw-confirm-item__image zw-img-frame zw-aspect-square" }, [
      el("img", {
        src: clean(item.image_url),
        alt: "",
        loading: "lazy",
        decoding: "async",
      }),
    ]),

    el("div", { class: "zw-confirm-item__body zw-stack-sm" }, bodyChildren),
  ]);
}

// ─── Totals ─────────────────────────────────────────────────────────────

function renderSummary(order) {
  const shipping = cents(order.shipping_cents);
  const bundleDiscount = cents(order.bundle_discount_cents);

  const rows = [
    summaryLine("Subtotal", formatMoney(cents(order.subtotal_cents))),

    bundleDiscount > 0
      ? summaryLine("Bundle discount", "−" + formatMoney(bundleDiscount))
      : null,

    summaryLine(
      order.shipping_province
        ? `Shipping (${provinceName(order.shipping_province)})`
        : "Shipping",
      shipping === 0 ? "Free in Ontario" : formatMoney(shipping),
    ),

    summaryLine("HST (13%)", formatMoney(cents(order.tax_cents))),
    summaryLine("Total", formatMoney(cents(order.total_cents)), { strong: true }),
  ].filter(Boolean);

  return el("dl", { class: "zw-order-summary" }, rows);
}

function summaryLine(label, value, { strong = false } = {}) {
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

// ─── Payment instructions ───────────────────────────────────────────────

function renderPaymentInstructions(order) {
  const orderNumber = clean(order.order_number) || "your order number";
  const total = cents(order.total_cents);

  return el("section", {
    class: "zw-block-accent zw-stack-sm",
    style: "margin-top: var(--zw-space-5);",
  }, [
    el("h3", {
      class: "zw-display",
      style: "font-size: 1.25rem; margin: 0;",
    }, ["payment instructions"]),

    el("p", {}, [
      "Send an Interac e-transfer for ",
      el("strong", {}, [formatMoney(total)]),
      " to ",
      el("strong", {}, [PAYMENTS_EMAIL]),
      ".",
    ]),

    el("p", { class: "zw-text-muted zw-text-small" }, [
      "Include your order number in the message field: ",
      el("strong", {}, [orderNumber]),
      ". Your order stays pending until payment is matched manually.",
    ]),
  ]);
}

// ─── Status note ────────────────────────────────────────────────────────

function renderStatusNote(status) {
  const normalizedStatus = clean(status);

  const labels = {
    paid: {
      headline: "Payment received",
      body: "We've matched your e-transfer. Your order is in production.",
    },
    fulfilled: {
      headline: "Order fulfilled",
      body: "Your order has shipped. Check your email for tracking if available.",
    },
    cancelled: {
      headline: "Order cancelled",
      body: `This order was cancelled. If that's a surprise, please message ${CONTACT_EMAIL}.`,
    },
  };

  const info = labels[normalizedStatus];
  if (!info) return null;

  return el("section", {
    class: "zw-block-accent",
    style: "margin-top: var(--zw-space-5);",
  }, [
    el("h3", {
      class: "zw-display",
      style: "font-size: 1.25rem; margin: 0 0 var(--zw-space-2);",
    }, [info.headline]),
    el("p", { style: "margin: 0;" }, [info.body]),
  ]);
}

// ─── Normalization helpers ──────────────────────────────────────────────

function normalizeOrderResponse(response) {
  if (!response || typeof response !== "object") return null;

  const order = response.order && typeof response.order === "object"
    ? response.order
    : response;

  return {
    ...order,
    order_number: clean(order.order_number ?? order.orderNumber),
    status: clean(order.status || "pending_payment"),
    shipping_province: clean(order.shipping_province).toUpperCase(),
    items: Array.isArray(order.items) ? order.items : [],
  };
}

function cents(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function positiveInt(value, fallback = 1) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function provinceName(code) {
  const key = clean(code).toUpperCase();
  return PROVINCE_LABELS[key] || key || "Canada";
}

function clean(value) {
  return String(value ?? "").trim();
}

// ─── Boot ───────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}