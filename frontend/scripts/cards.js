/* ============================================================================
   zazenware — cards.js
   ----------------------------------------------------------------------------
   Pure render functions for the four card types. Each function returns an
   HTMLElement; the calling page script appends them to the right container.

   Card rules (Master Spec § 9):
     - DesignCard:  parent artwork only. NEVER has Add to Cart.
                    Shows View Shirt / View Patch / View Print links if those
                    children exist (jumps to /shop.html#<type>-<slug>).
     - ShirtCard:   size + colour required before Add to Cart enables.
                    Sizes: S, M, L, XL, 2XL.  Colours: Black, White.
     - PatchCard:   immediate Add to Cart, no variants.
     - PrintCard:   immediate Add to Cart, no variants.
   ============================================================================ */

import { el } from "./format.js";
import { formatMoney } from "./format.js";
import { addToCart } from "./cart.js";

const SHIRT_SIZES  = ["S", "M", "L", "XL", "2XL"];
const SHIRT_COLORS = ["Black", "White"];

/** Common card image element with lazy loading. */
function cardImage(src, alt) {
  return el("div", { class: "zw-card__image zw-img-frame zw-aspect-square" }, [
    el("img", {
      src: src || "",
      alt: alt || "",
      loading: "lazy",
      decoding: "async",
    }),
  ]);
}

/* ─── DesignCard (Art page) ──────────────────────────────────────────── */

export function renderDesignCard(design) {
  const actions = [];
  if (design.shirt) actions.push(
    el("a", {
      href: `/shop.html#shirt-${design.slug}`,
      class: "zw-btn zw-btn--secondary zw-btn--small",
    }, ["View shirt"])
  );
  if (design.patch) actions.push(
    el("a", {
      href: `/shop.html#patch-${design.slug}`,
      class: "zw-btn zw-btn--secondary zw-btn--small",
    }, ["View patch"])
  );
  if (design.print) actions.push(
    el("a", {
      href: `/shop.html#print-${design.slug}`,
      class: "zw-btn zw-btn--secondary zw-btn--small",
    }, ["View print"])
  );

  return el("article", {
    class: "zw-card zw-design-card",
    dataset: { slug: design.slug },
  }, [
    cardImage(design.image_url, design.alt_text),
    el("div", { class: "zw-card__body" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),
      el("p", { class: "zw-card__meta" }, [design.short_description || ""]),
      actions.length > 0
        ? el("div", { class: "zw-card__actions zw-cluster" }, actions)
        : el("p", { class: "zw-text-muted zw-text-small" }, ["Not available right now."]),
    ]),
  ]);
}

/* ─── ShirtCard ──────────────────────────────────────────────────────── */

export function renderShirtCard(design) {
  const shirt = design.shirt;
  if (!shirt) return null;

  let selectedSize = null;
  let selectedColor = null;
  const helperId = `shirt-helper-${design.slug}`;

  const sizeButtons = SHIRT_SIZES.map((size) =>
    el("button", {
      type: "button",
      class: "zw-btn zw-btn--small zw-variant-btn",
      "aria-pressed": "false",
      dataset: { variantType: "size", variant: size },
      onClick: (e) => { selectedSize = size; updatePressed(e.currentTarget, sizeButtons); refreshAdd(); },
    }, [size])
  );

  const colorButtons = SHIRT_COLORS.map((color) =>
    el("button", {
      type: "button",
      class: "zw-btn zw-btn--small zw-variant-btn",
      "aria-pressed": "false",
      dataset: { variantType: "color", variant: color },
      onClick: (e) => { selectedColor = color; updatePressed(e.currentTarget, colorButtons); refreshAdd(); },
    }, [color])
  );

  const addBtn = el("button", {
    type: "button",
    class: "zw-btn zw-btn--primary",
    disabled: true,
    "aria-disabled": "true",
    "aria-describedby": helperId,
    onClick: () => handleAddShirt(design, shirt, selectedSize, selectedColor, statusEl),
  }, ["Add to cart"]);

  const helper = el("p", {
    class: "zw-card__helper zw-text-muted zw-text-small",
    id: helperId,
  }, ["Select size and colour first."]);

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  function refreshAdd() {
    const ok = selectedSize && selectedColor;
    addBtn.disabled = !ok;
    addBtn.setAttribute("aria-disabled", ok ? "false" : "true");
    if (ok) helper.textContent = `Selected: size ${selectedSize}, colour ${selectedColor}.`;
    else    helper.textContent = "Select size and colour first.";
  }

  return el("article", {
    class: "zw-card zw-shirt-card",
    id: `shirt-${design.slug}`,
    dataset: { slug: design.slug, productId: String(shirt.id) },
  }, [
    cardImage(shirt.image_url, shirt.alt_text || `${design.name} shirt`),
    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),
      el("p", { class: "zw-card__price" }, [formatMoney(shirt.unit_price_cents)]),
      el("div", { class: "zw-card__variants zw-stack-sm" }, [
        el("fieldset", { class: "zw-variant-group" }, [
          el("legend", { class: "zw-variant-legend" }, ["Size"]),
          el("div", { class: "zw-cluster zw-cluster-sm" }, sizeButtons),
        ]),
        el("fieldset", { class: "zw-variant-group" }, [
          el("legend", { class: "zw-variant-legend" }, ["Colour"]),
          el("div", { class: "zw-cluster zw-cluster-sm" }, colorButtons),
        ]),
      ]),
      helper,
      el("div", { class: "zw-card__actions" }, [addBtn]),
      statusEl,
    ]),
  ]);
}

/* ─── PatchCard ──────────────────────────────────────────────────────── */

export function renderPatchCard(design) {
  const patch = design.patch;
  if (!patch) return null;

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  return el("article", {
    class: "zw-card zw-patch-card",
    id: `patch-${design.slug}`,
    dataset: { slug: design.slug, productId: String(patch.id) },
  }, [
    cardImage(patch.image_url, patch.alt_text || `${design.name} patch`),
    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),
      el("p", { class: "zw-card__meta" }, [patch.size_label || ""]),
      el("p", { class: "zw-card__price" }, [formatMoney(patch.unit_price_cents)]),
      el("div", { class: "zw-card__actions" }, [
        el("button", {
          type: "button",
          class: "zw-btn zw-btn--primary",
          onClick: () => handleAddSimple(design, patch, "patch", "Back Patch", statusEl),
        }, ["Add to cart"]),
      ]),
      statusEl,
    ]),
  ]);
}

/* ─── PrintCard ──────────────────────────────────────────────────────── */

export function renderPrintCard(design) {
  const print = design.print;
  if (!print) return null;

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  return el("article", {
    class: "zw-card zw-print-card",
    id: `print-${design.slug}`,
    dataset: { slug: design.slug, productId: String(print.id) },
  }, [
    cardImage(print.image_url, print.alt_text || `${design.name} print`),
    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),
      el("p", { class: "zw-card__meta" }, [print.size_label || ""]),
      el("p", { class: "zw-card__price" }, [formatMoney(print.unit_price_cents)]),
      el("div", { class: "zw-card__actions" }, [
        el("button", {
          type: "button",
          class: "zw-btn zw-btn--primary",
          onClick: () => handleAddSimple(design, print, "print", "Print", statusEl),
        }, ["Add to cart"]),
      ]),
      statusEl,
    ]),
  ]);
}

/* ─── Helpers ────────────────────────────────────────────────────────── */

function updatePressed(clicked, group) {
  for (const b of group) b.setAttribute("aria-pressed", b === clicked ? "true" : "false");
}

function flashStatus(statusEl, text, variant = "success") {
  statusEl.textContent = "";
  const cls = variant === "error" ? "zw-status zw-status--error" : "zw-status zw-status--success";
  statusEl.append(el("div", { class: cls }, [text]));
  // Clear after 4 seconds so it doesn't linger
  clearTimeout(statusEl._flashTimer);
  statusEl._flashTimer = setTimeout(() => { statusEl.textContent = ""; }, 4000);
}

function handleAddShirt(design, shirt, size, color, statusEl) {
  if (!size || !color) {
    flashStatus(statusEl, "Select size and colour first.", "error");
    return;
  }
  try {
    addToCart({
      product_id: Number(shirt.id),
      product_type: "shirt",
      design_slug: design.slug,
      name: `${design.name} — Shirt`,
      unit_price_cents: shirt.unit_price_cents,
      quantity: 1,
      image_url: shirt.image_url,
      size,
      color,
    });
    flashStatus(
      statusEl,
      `Added: ${design.name} shirt, size ${size}, colour ${color}.`,
      "success"
    );
  } catch (err) {
    console.error("[zw] addToCart failed:", err);
    flashStatus(statusEl, "Couldn't add to cart. Please try again.", "error");
  }
}

function handleAddSimple(design, product, type, label, statusEl) {
  try {
    addToCart({
      product_id: Number(product.id),
      product_type: type,
      design_slug: design.slug,
      name: `${design.name} — ${label}`,
      unit_price_cents: product.unit_price_cents,
      quantity: 1,
      image_url: product.image_url,
    });
    flashStatus(statusEl, `Added: ${design.name} ${label.toLowerCase()}.`, "success");
  } catch (err) {
    console.error("[zw] addToCart failed:", err);
    flashStatus(statusEl, "Couldn't add to cart. Please try again.", "error");
  }
}
