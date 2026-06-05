/* ============================================================================

   zazenware — cart.js

   ----------------------------------------------------------------------------

   The cart lives in localStorage under the key 'zw-cart' as a JSON array

   of cart lines. This module is the ONLY thing in the frontend that

   reads/writes that storage. Every other script (cards.js, cart-page.js,

   cart-badge.js) calls these functions.



   Cart line shape:

     {

       product_id:       number,

       product_type:     'shirt' | 'patch' | 'print',

       design_slug:      string,

       name:             string,

       unit_price_cents: integer,

       quantity:         integer 1..99,

       image_url:        string,

       size?:            'S' | 'M' | 'L' | 'XL' | '2XL',

       color?:           'Black' | 'White'

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



    return parsed

      .map(normalizeLine)

      .filter(Boolean);

  } catch (_) {

    return [];

  }

}



/** Replace the cart and notify listeners. */

function writeCart(lines) {

  const cleanLines = Array.isArray(lines)

    ? lines.map(normalizeLine).filter(Boolean)

    : [];



  try {

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanLines));

  } catch (err) {

    console.warn("[zw][cart] localStorage write failed:", err);

  }



  notifyCartUpdated();

}



/** Empty the cart and notify listeners. */

export function clearCart() {

  try {

    localStorage.removeItem(STORAGE_KEY);

  } catch (_) {

    /* ignore */

  }



  notifyCartUpdated();

}



function notifyCartUpdated() {

  document.dispatchEvent(new CustomEvent("zw:cart-updated"));

}



// ─── Public mutations ───────────────────────────────────────────────────



/**

 * Add a line. If a matching line exists, increment its quantity;

 * otherwise push a new line. Returns the resulting line.

 */

export function addToCart(line) {

  const nextLine = normalizeLine({

    ...line,

    quantity: line?.quantity ?? 1,

  });



  if (!nextLine) {

    throw new Error("[zw][cart] Invalid line: " + JSON.stringify(line));

  }



  const cart = readCart();

  const existing = cart.find((l) => sameProduct(l, nextLine));



  if (existing) {

    existing.quantity = clampInt(

      existing.quantity + nextLine.quantity,

      QTY_MIN,

      QTY_MAX,

    );

    writeCart(cart);

    return existing;

  }



  cart.push(nextLine);

  writeCart(cart);

  return nextLine;

}



/**

 * Change the quantity of a line identified by its index in the array.

 * Quantities below 1 remove the line. Quantities above 99 are clamped.

 */

export function updateQuantity(index, nextQty) {

  const cart = readCart();

  const i = Math.floor(Number(index));



  if (!Number.isInteger(i) || i < 0 || i >= cart.length) return cart;



  const q = Math.floor(Number(nextQty));



  if (!Number.isFinite(q) || q < QTY_MIN) {

    cart.splice(i, 1);

  } else {

    cart[i].quantity = clampInt(q, QTY_MIN, QTY_MAX);

  }



  writeCart(cart);

  return cart;

}



/** Remove a line by its array index. */

export function removeLine(index) {

  const cart = readCart();

  const i = Math.floor(Number(index));



  if (!Number.isInteger(i) || i < 0 || i >= cart.length) return cart;



  cart.splice(i, 1);

  writeCart(cart);

  return cart;

}



// ─── Derived getters ────────────────────────────────────────────────────



export function totalQuantity(cart = readCart()) {

  return cart.reduce((sum, line) => sum + line.quantity, 0);

}



export function subtotalCents(cart = readCart()) {

  return cart.reduce(

    (sum, line) => sum + line.unit_price_cents * line.quantity,

    0,

  );

}



export function hasBundle(cart = readCart()) {

  let hasShirt = false;

  let hasPatch = false;

  let hasPrint = false;



  for (const line of cart) {

    if (line.product_type === "shirt") hasShirt = true;

    if (line.product_type === "patch") hasPatch = true;

    if (line.product_type === "print") hasPrint = true;

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



function normalizeLine(line) {

  if (!line || typeof line !== "object") return null;



  const productType = String(line.product_type || "").trim().toLowerCase();



  const next = {

    product_id: numberOrNull(line.product_id),

    product_type: productType,

    design_slug: stringOrEmpty(line.design_slug),

    name: stringOrEmpty(line.name),

    unit_price_cents: intOrNull(line.unit_price_cents),

    quantity: clampInt(line.quantity ?? 1, QTY_MIN, QTY_MAX),

    image_url: stringOrEmpty(line.image_url),

  };



  if (productType === "shirt") {

    next.size = stringOrEmpty(line.size).toUpperCase();

    next.color = normalizeColor(line.color);

  }



  if (!isValidLine(next)) return null;



  return next;

}



function isValidLine(line) {

  if (!line || typeof line !== "object") return false;



  if (!Number.isInteger(line.product_id) || line.product_id <= 0) return false;

  if (!validProductTypes.has(line.product_type)) return false;



  if (!line.design_slug) return false;

  if (!line.name) return false;



  if (!Number.isInteger(line.unit_price_cents) || line.unit_price_cents <= 0) {

    return false;

  }



  if (!Number.isInteger(line.quantity)) return false;

  if (line.quantity < QTY_MIN || line.quantity > QTY_MAX) return false;



  if (typeof line.image_url !== "string") return false;



  if (line.product_type === "shirt") {

    if (!validShirtSizes.has(line.size)) return false;

    if (!validShirtColors.has(line.color)) return false;

  } else {

    if (line.size !== undefined || line.color !== undefined) return false;

  }



  return true;

}



function numberOrNull(value) {

  const n = Number(value);

  return Number.isFinite(n) ? n : null;

}



function intOrNull(value) {

  const n = Math.round(Number(value));

  return Number.isFinite(n) ? n : null;

}



function stringOrEmpty(value) {

  return String(value ?? "").trim();

}



function normalizeColor(value) {

  const c = stringOrEmpty(value).toLowerCase();



  if (c === "black") return "Black";

  if (c === "white") return "White";



  return stringOrEmpty(value);

}



// Make the storage event from other tabs trigger the same custom event.

window.addEventListener("storage", (event) => {

  if (event.key === STORAGE_KEY) notifyCartUpdated();

});