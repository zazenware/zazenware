/* ============================================================================
   zazenware — cart-math.js
   ----------------------------------------------------------------------------
   PURE FUNCTIONS for client-side preview math only.

   Authority rule (Master Spec § 12): the backend is the source of truth for
   final totals on order submission. This file produces the same numbers for
   live preview on the Cart page so the customer sees what they'll pay.

   Math (§ 6.5):
     subtotal_cents    = sum(line.unit_price_cents × line.quantity)
     has_bundle        = (has shirt) AND (has patch) AND (has print)
     bundle_discount   = has_bundle ? 500 : 0
     shipping_cents    = (province === 'ON') ? 0 : 1000
     tax_base          = subtotal − bundle + shipping
     tax_rate_bps      = 1300                       // 13.00% HST
     tax_cents         = ROUND(tax_base × tax_rate_bps / 10000)
     total_cents       = tax_base + tax_cents
   ============================================================================ */

export const TAX_RATE_BPS = 1300;     // 13.00% HST
export const BUNDLE_DISCOUNT_CENTS = 500;
export const SHIPPING_FLAT_CENTS = 1000;
export const FREE_SHIPPING_PROVINCE = "ON";

export const VALID_PROVINCES = [
  "ON","QC","BC","AB","MB","SK","NS","NB","NL","PE","YT","NT","NU",
];

/** Compute subtotal in cents. */
export function subtotal(cart) {
  return cart.reduce(
    (s, l) => s + Number(l.unit_price_cents) * Number(l.quantity),
    0,
  );
}

/** True when cart contains at least one shirt, one patch, and one print. */
export function hasBundle(cart) {
  let s = false, pa = false, pr = false;
  for (const l of cart) {
    if      (l.product_type === "shirt") s  = true;
    else if (l.product_type === "patch") pa = true;
    else if (l.product_type === "print") pr = true;
  }
  return s && pa && pr;
}

/** Bundle discount in cents (one bundle only — does NOT stack). */
export function bundleDiscount(cart) {
  return hasBundle(cart) ? BUNDLE_DISCOUNT_CENTS : 0;
}

/** Shipping cents for a province code. Returns null if province not selected. */
export function shippingCentsForProvince(province) {
  if (!province) return null;
  if (!VALID_PROVINCES.includes(province)) return null;
  return province === FREE_SHIPPING_PROVINCE ? 0 : SHIPPING_FLAT_CENTS;
}

/** ROUND half-away-from-zero, matching server-side Math.round behaviour. */
function round(n) {
  return Math.sign(n) * Math.round(Math.abs(n));
}

/**
 * Full breakdown for the order summary panel.
 * Returns nulls for shipping/tax/total if no province is selected yet.
 */
export function breakdown(cart, province) {
  const sub  = subtotal(cart);
  const bun  = bundleDiscount(cart);
  const ship = shippingCentsForProvince(province);

  if (ship === null) {
    // Province not chosen — partial preview only.
    return {
      subtotal_cents: sub,
      bundle_discount_cents: bun,
      has_bundle: hasBundle(cart),
      shipping_cents: null,
      tax_cents: null,
      total_cents: null,
      tax_rate_bps: TAX_RATE_BPS,
    };
  }

  const taxBase = sub - bun + ship;
  const tax     = round(taxBase * TAX_RATE_BPS / 10000);
  const total   = taxBase + tax;

  return {
    subtotal_cents: sub,
    bundle_discount_cents: bun,
    has_bundle: hasBundle(cart),
    shipping_cents: ship,
    tax_cents: tax,
    total_cents: total,
    tax_rate_bps: TAX_RATE_BPS,
  };
}
