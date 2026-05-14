/* ============================================================================
   zazenware — order-confirmation.js
   ----------------------------------------------------------------------------
   Mount the Order Confirmation page. Responsibilities:

     1. Read ?order= from the URL.
     2. Validate the format client-side (ZW-YYYY-NNNNNN).
     3. Fetch GET /api/orders/:order_number.
     4. Render the order number, item list, summary breakdown, and the
        e-transfer instructions block.

   Failure modes:
     - No ?order= param         → "(no order number)" muted state
     - Bad format               → red order number, "Order details unavailable" panel
     - 404 from API             → "Order not found" panel
     - Network / 5xx            → error panel with Retry button
     - 200 OK                   → full render

   This file replaces the inline reader script that lived in order-confirmation.html
   in E-04. The HTML now mounts hooks; this script does the work.
   ============================================================================ */

import { api, ApiError } from "./api.js";
import { el, formatMoney } from "./format.js";

const ORDER_NUMBER_REGEX = /^ZW-\d{4}-\d{6}$/;

const PAYMENTS_EMAIL = "payments@zazenware.com";

const PROVINCE_LABELS = {
  ON: "Ontario", QC: "Quebec", BC: "British Columbia", AB: "Alberta",
  MB: "Manitoba", SK: "Saskatchewan", NS: "Nova Scotia", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", PE: "Prince Edward Island",
  YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut",
};

async function mount() {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = (params.get("order") || "").trim();

  renderHeaderNumber(orderNumber);

  const detailsEl = document.getElementById("order-details");
  if (!detailsEl) return;

  // No param at all
  if (!orderNumber) {
    renderInfoPanel(detailsEl,
      "No order number was provided.",
      "If you just placed an order, please check your email for the order number, or message contact@zazenware.com."
    );
    return;
  }

  // Bad format
  if (!ORDER_NUMBER_REGEX.test(orderNumber)) {
    renderInfoPanel(detailsEl,
      "That order number isn't in the expected format.",
      `Order numbers look like ZW-2026-000123. If you have your order confirmation email, paste the exact number from there. Otherwise message contact@zazenware.com.`
    );
    return;
  }

  // Loading state
  renderLoading(detailsEl);

  try {
    const { order } = await api.getOrder(orderNumber);
    renderOrder(detailsEl, order);
  } catch (err) {
    console.error("[zw] Failed to fetch order:", err);
    if (err instanceof ApiError && err.status === 404) {
      renderInfoPanel(detailsEl,
        "Order not found.",
        "If you just submitted your order, give the page a few seconds and refresh. If you keep seeing this, message contact@zazenware.com with this order number."
      );
    } else if (err instanceof ApiError && err.status === 400) {
      renderInfoPanel(detailsEl,
        "We couldn't read that order number.",
        err.message || "Order numbers look like ZW-2026-000123."
      );
    } else {
      renderErrorPanel(detailsEl, err?.message);
    }
  }
}

// ─── Top-of-page order number block ─────────────────────────────────────
function renderHeaderNumber(orderNumber) {
  const target = document.getElementById("order-number");
  if (!target) return;

  if (orderNumber && ORDER_NUMBER_REGEX.test(orderNumber)) {
    target.textContent = orderNumber;
    target.style.color = "";
    document.title = `${orderNumber} — Order confirmation — zazenware`;
  } else if (orderNumber) {
    target.textContent = orderNumber;
    target.style.color = "var(--zw-error)";
  } else {
    target.textContent = "(no order number)";
    target.style.color = "var(--zw-text-muted)";
  }
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

// ─── Full successful render ─────────────────────────────────────────────
function renderOrder(container, order) {
  container.innerHTML = "";

  // Section: Items
  container.append(
    el("h2", { class: "zw-display", style: "font-size: 1.5rem;" }, ["order details"]),
    renderItemsList(order.items || []),
  );

  // Section: Summary breakdown
  container.append(
    el("h3", { class: "zw-display", style: "font-size: 1.25rem; margin-top: var(--zw-space-5);" }, ["totals"]),
    renderSummary(order),
  );

  // Section: Status note
  if (order.status && order.status !== "pending_payment") {
    container.append(renderStatusNote(order.status));
  }
}

function renderItemsList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return el("p", { class: "zw-text-muted" }, ["No items recorded for this order."]);
  }

  const list = el("ul", { class: "zw-confirm-items", role: "list" });
  for (const item of items) list.append(renderItem(item));
  return list;
}

function renderItem(item) {
  const optionText = item.product_type === "shirt" && item.size && item.color
    ? `Size: ${item.size} · Colour: ${item.color}`
    : "";

  return el("li", { class: "zw-confirm-item" }, [
    el("div", { class: "zw-confirm-item__image zw-img-frame zw-aspect-square" }, [
      el("img", {
        src: item.image_url || "",
        alt: "",
        loading: "lazy",
        decoding: "async",
      }),
    ]),
    el("div", { class: "zw-confirm-item__body zw-stack-sm" }, [
      el("h4", { class: "zw-confirm-item__title" }, [item.product_name || "Item"]),
      optionText
        ? el("p", { class: "zw-text-muted zw-text-small" }, [optionText])
        : null,
      el("p", { class: "zw-text-small" }, [
        `${item.quantity} × ${formatMoney(item.unit_price_cents)} = `,
        el("strong", {}, [formatMoney(item.line_total_cents)]),
      ]),
    ]),
  ]);
}

function renderSummary(order) {
  const shippingDisplay = order.shipping_cents === 0
    ? `Free in Ontario`
    : formatMoney(order.shipping_cents);

  const rows = [
    summaryLine("Subtotal", formatMoney(order.subtotal_cents)),
    order.bundle_discount_cents > 0
      ? summaryLine("Bundle discount", "−" + formatMoney(order.bundle_discount_cents))
      : null,
    summaryLine(
      order.shipping_province
        ? `Shipping (${order.shipping_province})`
        : "Shipping",
      shippingDisplay,
    ),
    summaryLine("HST (13%)", formatMoney(order.tax_cents)),
    summaryLine("Total", formatMoney(order.total_cents), { strong: true }),
  ];

  return el("dl", { class: "zw-order-summary" }, rows);
}

function summaryLine(label, value, { strong = false } = {}) {
  return el("div", {
    class: "zw-order-summary__line" + (strong ? " zw-order-summary__total" : ""),
  }, [
    el("dt", {}, [label]),
    el("dd", {}, [strong ? el("strong", {}, [value]) : value]),
  ]);
}

function renderStatusNote(status) {
  const labels = {
    paid: { headline: "Payment received", body: "We've matched your e-transfer. Your order is in production." },
    fulfilled: { headline: "Order fulfilled", body: "Your order has shipped. Check your email for tracking if available." },
    cancelled: { headline: "Order cancelled", body: "This order was cancelled. If that's a surprise, please message contact@zazenware.com." },
  };
  const info = labels[status];
  if (!info) return null;

  return el("section", { class: "zw-block-accent", style: "margin-top: var(--zw-space-5);" }, [
    el("h3", { class: "zw-display", style: "font-size: 1.25rem; margin: 0 0 var(--zw-space-2);" }, [info.headline]),
    el("p", { style: "margin: 0;" }, [info.body]),
  ]);
}

// ─── Boot ───────────────────────────────────────────────────────────────
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
