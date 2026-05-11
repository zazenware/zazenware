// =============================================================================
// zazenware — services/orders.service.js
// =============================================================================
// All order business logic lives here. Route handlers call createOrder() and
// fetchOrderByNumber(); never touch the pool directly.
//
// Authority (Master Spec § 12): this service is the source of truth for
// prices, totals, statuses, and order numbers. Everything from the request
// payload is treated as untrusted input.
// =============================================================================

import { query, withTransaction } from "../lib/db.js";
import { errors } from "../middleware/errors.js";

// ─── Constants (mirror frontend/cart-math.js) ────────────────────────────
const TAX_RATE_BPS         = 1300;     // 13.00% HST
const BUNDLE_DISCOUNT_CENTS = 500;
const SHIPPING_FLAT_CENTS  = 1000;
const FREE_SHIP_PROVINCE   = "ON";

const VALID_PROVINCES = new Set([
  "ON","QC","BC","AB","MB","SK","NS","NB","NL","PE","YT","NT","NU",
]);

const VALID_PRODUCT_TYPES = new Set(["shirt", "patch", "print"]);
const VALID_SHIRT_SIZES   = new Set(["S","M","L","XL","2XL"]);
const VALID_SHIRT_COLORS  = new Set(["Black","White"]);

const EMAIL_REGEX        = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const POSTAL_CODE_REGEX  = /^[A-CEGHJ-NPRSTVXY][0-9][A-CEGHJ-NPRSTV-Z] ?[0-9][A-CEGHJ-NPRSTV-Z][0-9]$/i;
const SLUG_REGEX         = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const TIME_TRAP_MIN_MS   = 3000;       // submissions under 3s rejected
const TIME_TRAP_MAX_AGE  = 24 * 60 * 60 * 1000;   // 24h sanity ceiling

const MAX_ITEMS_PER_ORDER = 50;
const MAX_QTY_PER_LINE    = 99;

// ─── createOrder ─────────────────────────────────────────────────────────

/**
 * Validate input, recalculate authoritatively, insert order + items, return
 * the persisted record shape that gets returned to the client.
 *
 * @param {object} input  Raw request body
 * @param {Date}   now    Injectable clock (defaults to new Date()).
 * @returns {Promise<object>} Persisted order summary
 */
export async function createOrder(input, now = new Date()) {
  // ─── Step 1: shape validation ─────────────────────────────────────────
  const fieldErrors = [];
  const v = validateShape(input || {}, fieldErrors, now);

  if (fieldErrors.length > 0) {
    throw errors.validation("Order payload is invalid.", fieldErrors);
  }

  if (!Array.isArray(v.items) || v.items.length === 0) {
    throw errors.badRequest("Order must contain at least one item.", ["items"]);
  }
  if (v.items.length > MAX_ITEMS_PER_ORDER) {
    throw errors.badRequest(`Too many lines (max ${MAX_ITEMS_PER_ORDER}).`, ["items"]);
  }

  // ─── Step 2: hydrate every item from the DB (authoritative prices) ────
  const productRows = await fetchAllProductsForItems(v.items);
  const items = v.items.map((it) => buildLine(it, productRows));

  // ─── Step 3: server-side math ─────────────────────────────────────────
  const subtotal = items.reduce((s, l) => s + l.line_total_cents, 0);
  const hasBundle = items.some(l => l.product_type === "shirt")
                 && items.some(l => l.product_type === "patch")
                 && items.some(l => l.product_type === "print");
  const bundleDiscount = hasBundle ? BUNDLE_DISCOUNT_CENTS : 0;
  const shipping = v.shipping_province === FREE_SHIP_PROVINCE ? 0 : SHIPPING_FLAT_CENTS;
  const taxBase = subtotal - bundleDiscount + shipping;
  const taxCents = roundHalfAwayFromZero(taxBase * TAX_RATE_BPS / 10000);
  const totalCents = taxBase + taxCents;

  if (subtotal < 0 || taxBase < 0 || totalCents < 0) {
    throw errors.badRequest("Computed totals are invalid.");
  }

  // ─── Step 4: insert as one transaction ────────────────────────────────
  const persisted = await withTransaction(async (client) => {
    const orderResult = await client.query(
      `INSERT INTO orders (
        customer_name, customer_email, customer_note,
        shipping_full_name, shipping_address_line_1, shipping_address_line_2,
        shipping_city, shipping_province, shipping_postal_code, shipping_country,
        subtotal_cents, bundle_discount_cents, shipping_cents,
        tax_rate_bps, tax_cents, total_cents
      ) VALUES (
        $1,$2,$3, $4,$5,$6, $7,$8,$9,$10,
        $11,$12,$13, $14,$15,$16
      ) RETURNING id, order_number, status, email_status, created_at`,
      [
        v.customer_name, v.customer_email, v.customer_note,
        v.shipping_full_name, v.shipping_address_line_1, v.shipping_address_line_2,
        v.shipping_city, v.shipping_province, v.shipping_postal_code, "CA",
        subtotal, bundleDiscount, shipping,
        TAX_RATE_BPS, taxCents, totalCents,
      ],
    );
    const order = orderResult.rows[0];

    // Insert order_items rows
    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (
          order_id, product_type, product_id, design_slug, product_name,
          shirt_size, shirt_color,
          unit_price_cents, quantity, line_total_cents, image_url
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          order.id, item.product_type, item.product_id, item.design_slug, item.product_name,
          item.shirt_size, item.shirt_color,
          item.unit_price_cents, item.quantity, item.line_total_cents, item.image_url,
        ],
      );
    }

    return order;
  });

  return {
    order_number: persisted.order_number,
    status: persisted.status,
    email_status: persisted.email_status,
    created_at: persisted.created_at,
    subtotal_cents: subtotal,
    bundle_discount_cents: bundleDiscount,
    shipping_cents: shipping,
    tax_rate_bps: TAX_RATE_BPS,
    tax_cents: taxCents,
    total_cents: totalCents,
    items: items.map((it) => publicItemDTO(it)),
    shipping_province: v.shipping_province,
  };
}

// ─── fetchOrderByNumber ──────────────────────────────────────────────────

/**
 * Read a single order by its ZW-YYYY-NNNNNN number. Returns the public DTO
 * (no shipping address, no PII — the order_number URL is semi-public).
 */
export async function fetchOrderByNumber(orderNumber) {
  if (typeof orderNumber !== "string" || !/^ZW-\d{4}-\d{6}$/.test(orderNumber)) {
    return null;
  }

  const orderRes = await query(
    `SELECT id, order_number, status, email_status, created_at,
            subtotal_cents, bundle_discount_cents, shipping_cents,
            tax_rate_bps, tax_cents, total_cents,
            shipping_province
       FROM orders
      WHERE order_number = $1`,
    [orderNumber],
  );
  const order = orderRes.rows[0];
  if (!order) return null;

  const itemsRes = await query(
    `SELECT product_type, design_slug, product_name,
            shirt_size, shirt_color,
            unit_price_cents, quantity, line_total_cents, image_url
       FROM order_items
      WHERE order_id = $1
      ORDER BY id`,
    [order.id],
  );

  return {
    order_number: order.order_number,
    status: order.status,
    created_at: order.created_at,
    subtotal_cents: order.subtotal_cents,
    bundle_discount_cents: order.bundle_discount_cents,
    shipping_cents: order.shipping_cents,
    tax_rate_bps: order.tax_rate_bps,
    tax_cents: order.tax_cents,
    total_cents: order.total_cents,
    shipping_province: order.shipping_province,
    items: itemsRes.rows.map(publicItemDTO),
  };
}

// ─── Validation helpers ──────────────────────────────────────────────────

function validateShape(input, fieldErrors, now) {
  const out = {};

  // Honeypot — must be empty
  if (input.zw_hp && String(input.zw_hp).trim() !== "") {
    // Generic rejection — never disclose which spam check failed
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }

  // Time-trap — at least 3s since form load, no older than 24h
  const zwT = Number(input.zw_t);
  if (!Number.isFinite(zwT)) {
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }
  const age = now.getTime() - zwT;
  if (age < TIME_TRAP_MIN_MS || age > TIME_TRAP_MAX_AGE) {
    throw errors.badRequest("Submission could not be processed. Please refresh and try again.");
  }

  // Customer name
  out.customer_name = trimmedStr(input.customer_name, 1, 120, fieldErrors, "customer_name");
  // Email
  const email = trimmedStr(input.customer_email, 1, 254, fieldErrors, "customer_email");
  if (email && !EMAIL_REGEX.test(email)) fieldErrors.push("customer_email");
  out.customer_email = email ? email.toLowerCase() : "";
  // Optional note
  const note = typeof input.customer_note === "string" ? input.customer_note.trim() : "";
  if (note.length > 500) fieldErrors.push("customer_note");
  out.customer_note = note || null;

  // Shipping
  out.shipping_full_name      = trimmedStr(input.shipping_full_name,      1, 120, fieldErrors, "shipping_full_name");
  out.shipping_address_line_1 = trimmedStr(input.shipping_address_line_1, 1, 200, fieldErrors, "shipping_address_line_1");
  const line2 = typeof input.shipping_address_line_2 === "string" ? input.shipping_address_line_2.trim() : "";
  if (line2.length > 200) fieldErrors.push("shipping_address_line_2");
  out.shipping_address_line_2 = line2 || null;
  out.shipping_city           = trimmedStr(input.shipping_city, 1, 100, fieldErrors, "shipping_city");

  const province = String(input.shipping_province || "").trim().toUpperCase();
  if (!VALID_PROVINCES.has(province)) fieldErrors.push("shipping_province");
  out.shipping_province = province;

  // Postal — normalize and validate
  const postal = normalizePostal(input.shipping_postal_code);
  if (!POSTAL_CODE_REGEX.test(postal)) fieldErrors.push("shipping_postal_code");
  out.shipping_postal_code = postal;

  // Country must be CA (we don't accept anything else)
  if (input.shipping_country && String(input.shipping_country).toUpperCase() !== "CA") {
    fieldErrors.push("shipping_country");
  }

  // Items
  out.items = Array.isArray(input.items) ? input.items : [];

  return out;
}

function trimmedStr(value, min, max, fieldErrors, key) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min || s.length > max) {
    fieldErrors.push(key);
    return "";
  }
  return s;
}

function normalizePostal(value) {
  if (typeof value !== "string") return "";
  const clean = value.toUpperCase().replace(/\s+/g, "");
  if (clean.length === 6) return clean.slice(0, 3) + " " + clean.slice(3);
  return clean;
}

function roundHalfAwayFromZero(n) {
  return Math.sign(n) * Math.round(Math.abs(n));
}

// ─── Hydrate items from the DB ───────────────────────────────────────────

async function fetchAllProductsForItems(items) {
  const shirtIds = items.filter(i => i.product_type === "shirt").map(i => Number(i.product_id));
  const patchIds = items.filter(i => i.product_type === "patch").map(i => Number(i.product_id));
  const printIds = items.filter(i => i.product_type === "print").map(i => Number(i.product_id));

  const [shirts, patches, prints] = await Promise.all([
    shirtIds.length
      ? query(
          `SELECT s.id, s.unit_price_cents, s.image_url, s.is_active,
                  d.slug AS design_slug, d.name AS design_name, d.is_active AS design_active
             FROM shirts s JOIN designs d ON d.id = s.design_id
            WHERE s.id = ANY($1::bigint[])`,
          [shirtIds],
        ).then(r => r.rows)
      : Promise.resolve([]),
    patchIds.length
      ? query(
          `SELECT p.id, p.unit_price_cents, p.image_url, p.is_active,
                  d.slug AS design_slug, d.name AS design_name, d.is_active AS design_active
             FROM patches p JOIN designs d ON d.id = p.design_id
            WHERE p.id = ANY($1::bigint[])`,
          [patchIds],
        ).then(r => r.rows)
      : Promise.resolve([]),
    printIds.length
      ? query(
          `SELECT p.id, p.unit_price_cents, p.image_url, p.is_active,
                  d.slug AS design_slug, d.name AS design_name, d.is_active AS design_active
             FROM prints p JOIN designs d ON d.id = p.design_id
            WHERE p.id = ANY($1::bigint[])`,
          [printIds],
        ).then(r => r.rows)
      : Promise.resolve([]),
  ]);

  return {
    shirt: new Map(shirts.map(r => [Number(r.id), r])),
    patch: new Map(patches.map(r => [Number(r.id), r])),
    print: new Map(prints.map(r => [Number(r.id), r])),
  };
}

function buildLine(input, productRows) {
  // Per-item shape
  const type = input.product_type;
  if (!VALID_PRODUCT_TYPES.has(type)) {
    throw errors.badRequest("Invalid product type.", ["items"]);
  }

  const id = Number(input.product_id);
  if (!Number.isFinite(id) || id <= 0) {
    throw errors.badRequest("Invalid product id.", ["items"]);
  }

  const slug = String(input.design_slug || "");
  if (!SLUG_REGEX.test(slug)) {
    throw errors.badRequest("Invalid design slug.", ["items"]);
  }

  const qty = Math.floor(Number(input.quantity));
  if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
    throw errors.badRequest("Invalid quantity.", ["items"]);
  }

  const row = productRows[type].get(id);
  if (!row) {
    throw errors.badRequest(`Product not found or unavailable: ${type} #${id}.`, ["items"]);
  }
  if (!row.is_active || !row.design_active) {
    throw errors.badRequest(`Product is no longer available: ${type} #${id}.`, ["items"]);
  }
  if (row.design_slug !== slug) {
    throw errors.badRequest(`Product/slug mismatch.`, ["items"]);
  }

  // Shirt-only options
  let shirtSize = null;
  let shirtColor = null;
  if (type === "shirt") {
    shirtSize  = String(input.size  || "");
    shirtColor = String(input.color || "");
    if (!VALID_SHIRT_SIZES.has(shirtSize))   throw errors.badRequest("Invalid shirt size.",   ["items"]);
    if (!VALID_SHIRT_COLORS.has(shirtColor)) throw errors.badRequest("Invalid shirt colour.", ["items"]);
  } else if (input.size !== undefined || input.color !== undefined) {
    throw errors.badRequest("Non-shirt items must not have size or colour.", ["items"]);
  }

  const unitPrice = Number(row.unit_price_cents);
  const lineTotal = unitPrice * qty;
  const productName = type === "shirt"
    ? `${row.design_name} — Shirt`
    : type === "patch"
      ? `${row.design_name} — Back Patch`
      : `${row.design_name} — Print`;

  return {
    product_type: type,
    product_id: id,
    design_slug: row.design_slug,
    product_name: productName,
    shirt_size: shirtSize,
    shirt_color: shirtColor,
    unit_price_cents: unitPrice,
    quantity: qty,
    line_total_cents: lineTotal,
    image_url: row.image_url || null,
  };
}

function publicItemDTO(item) {
  return {
    product_type: item.product_type,
    design_slug: item.design_slug,
    product_name: item.product_name,
    ...(item.shirt_size  ? { size:  item.shirt_size  } : {}),
    ...(item.shirt_color ? { color: item.shirt_color } : {}),
    unit_price_cents: item.unit_price_cents,
    quantity: item.quantity,
    line_total_cents: item.line_total_cents,
    image_url: item.image_url,
  };
}
