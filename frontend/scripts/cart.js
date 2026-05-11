/* ============================================================================
   zazenware — cart.js
   ----------------------------------------------------------------------------
   The cart lives in localStorage under the key 'zw-cart' as a JSON array
   of cart lines. This module is the ONLY thing in the frontend that
   reads/writes that storage. Every other script (cards.js, cart-page.js,
   cart-badge.js) calls these functions.

   Cart line shape (Master Spec § 10.2):
     {
       product_id:       number,           // backend id of the shirt/patch/print
       product_type:     'shirt' | 'patch' | 'print',
       design_slug:      string,
       name:             string,           // e.g. "Black Sun — Shirt"
       unit_price_cents: integer,
       quantity:         integer 1..99,
       image_url:        string,
       size?:            'S' | 'M' | 'L' | 'XL' | '2XL'  // shirts only
       color?:           'Black' | 'White'                // shirts only
     }

   Merge rule:
     - same product_id + same product_type + same size + same color → quantity++
     - shirts with different size or color → new line
     - patches/prints have no variants — same product_id always merges
   ============================================================================ */

import { clampInt } from "./format.js";

const STORAGE_KEY = "zw-cart";
const QTY_MIN = 1;
const QTY_MAX = 99;

const validProductTypes = new Set(["shirt", "patch", "print"]);
const validShirtSizes   = new Set(["S", "M", "L", "XL", "2XL"]);
const validShirtColors  = new Set(["Black", "White"]);

// ─── Read / write ───────────────────────────────────────────────────────

/** Return the current cart, or [] if empty/corrupt. */
export function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidLine);
  } catch (_) {
    return [];
  }
}

/** Replace the cart and notify listeners. */
function writeCart(lines) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch (err) {
    console.warn("[zw][cart] localStorage write failed:", err);
  }
  document.dispatchEvent(new CustomEvent("zw:cart-updated"));
}

/** Empty the cart and notify listeners. */
export function clearCart() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) { /* ignore */ }
  document.dispatchEvent(new CustomEvent("zw:cart-updated"));
}

// ─── Public mutations ───────────────────────────────────────────────────

/**
 * Add a line. If a matching line exists (per merge rule), increment its
 * quantity; otherwise push a new line. Returns the resulting line.
 */
export function addToCart(line) {
  if (!isValidLine(line)) {
    throw new Error("[zw][cart] Invalid line: " + JSON.stringify(line));
  }

  const cart = readCart();
  const existing = cart.find((l) => sameProduct(l, line));

  if (existing) {
    existing.quantity = clampInt(existing.quantity + (line.quantity || 1), QTY_MIN, QTY_MAX);
  } else {
    cart.push({ ...line, quantity: clampInt(line.quantity || 1, QTY_MIN, QTY_MAX) });
  }

  writeCart(cart);
  return existing || cart[cart.length - 1];
}

/**
 * Change the quantity of a line identified by its index in the array.
 * Quantities below 1 remove the line. Quantities above 99 are clamped.
 */
export function updateQuantity(index, nextQty) {
  const cart = readCart();
  if (index < 0 || index >= cart.length) return null;

  const q = Math.floor(Number(nextQty));
  if (!Number.isFinite(q) || q < 1) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = clampInt(q, QTY_MIN, QTY_MAX);
  }
  writeCart(cart);
  return cart;
}

/** Remove a line by its array index. */
export function removeLine(index) {
  const cart = readCart();
  if (index < 0 || index >= cart.length) return cart;
  cart.splice(index, 1);
  writeCart(cart);
  return cart;
}

// ─── Derived getters ────────────────────────────────────────────────────

export function totalQuantity(cart = readCart()) {
  return cart.reduce((s, l) => s + l.quantity, 0);
}

export function subtotalCents(cart = readCart()) {
  return cart.reduce((s, l) => s + l.unit_price_cents * l.quantity, 0);
}

export function hasBundle(cart = readCart()) {
  let hasShirt = false, hasPatch = false, hasPrint = false;
  for (const l of cart) {
    if (l.product_type === "shirt") hasShirt = true;
    else if (l.product_type === "patch") hasPatch = true;
    else if (l.product_type === "print") hasPrint = true;
  }
  return hasShirt && hasPatch && hasPrint;
}

// ─── Private helpers ────────────────────────────────────────────────────

function sameProduct(a, b) {
  if (a.product_id !== b.product_id) return false;
  if (a.product_type !== b.product_type) return false;
  if (a.product_type === "shirt") {
    return a.size === b.size && a.color === b.color;
  }
  return true;
}

function isValidLine(l) {
  if (!l || typeof l !== "object") return false;
  if (typeof l.product_id !== "number" || !Number.isFinite(l.product_id)) return false;
  if (!validProductTypes.has(l.product_type)) return false;
  if (typeof l.design_slug !== "string" || !l.design_slug) return false;
  if (typeof l.name !== "string" || !l.name) return false;
  if (typeof l.unit_price_cents !== "number" || l.unit_price_cents <= 0) return false;
  if (typeof l.quantity !== "number" || l.quantity < 1 || l.quantity > 99) return false;

  if (l.product_type === "shirt") {
    if (!validShirtSizes.has(l.size)) return false;
    if (!validShirtColors.has(l.color)) return false;
  } else {
    if (l.size !== undefined || l.color !== undefined) return false;
  }
  return true;
}

// Make the storage event from other tabs trigger the same custom event
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    document.dispatchEvent(new CustomEvent("zw:cart-updated"));
  }
});
