// =============================================================================
// zazenware — services/designs.service.js
// =============================================================================
// All database access for designs lives here. Routes call these functions;
// they never touch the pg pool directly. This keeps SQL together for review.
//
// Authority rule (Master Spec § 12): the backend (and therefore this service)
// is the source of truth for prices, availability, and totals.
// =============================================================================

import { query } from "../lib/db.js";

/**
 * Shape returned to the API for one product child (shirt / patch / print).
 *
 * @typedef {Object} ProductChildDTO
 * @property {number}  id
 * @property {number}  unit_price_cents
 * @property {string}  image_url
 * @property {string}  alt_text
 * @property {?string} size_label        // patches + prints only
 */

/**
 * Shape returned to the API for one parent design.
 *
 * @typedef {Object} DesignDTO
 * @property {number}              id
 * @property {string}              slug
 * @property {string}              name
 * @property {string}              short_description
 * @property {?string}             long_description
 * @property {string}              image_url
 * @property {string}              alt_text
 * @property {number}              display_order
 * @property {?ProductChildDTO}    shirt
 * @property {?ProductChildDTO}    patch
 * @property {?ProductChildDTO}    print
 */

// ─── SELECT helpers ──────────────────────────────────────────────────────

const DESIGN_COLUMNS = `
  d.id,
  d.slug,
  d.name,
  d.short_description,
  d.long_description,
  d.image_url,
  d.alt_text,
  d.display_order
`;

/**
 * Return all active designs, joined with their active shirt/patch/print rows.
 * Inactive product children are omitted entirely from the response.
 * Inactive designs are omitted entirely from the list.
 *
 * Two queries (designs, then children in a single IN list) — never N+1.
 *
 * @returns {Promise<DesignDTO[]>}
 */
export async function listActiveDesigns() {
  const designsResult = await query(
    `SELECT ${DESIGN_COLUMNS}
       FROM designs d
      WHERE d.is_active = TRUE
      ORDER BY d.display_order ASC, d.id ASC`,
    []
  );

  const designs = designsResult.rows;
  if (designs.length === 0) return [];

  const designIds = designs.map((d) => d.id);
  const children = await fetchAllChildrenForDesignIds(designIds);

  return designs.map((d) => attachChildren(d, children));
}

/**
 * Return a single active design by slug, joined with its active children.
 * Returns null if no active design has that slug.
 *
 * @param {string} slug
 * @returns {Promise<DesignDTO|null>}
 */
export async function getActiveDesignBySlug(slug) {
  const designResult = await query(
    `SELECT ${DESIGN_COLUMNS}
       FROM designs d
      WHERE d.is_active = TRUE
        AND d.slug = $1
      LIMIT 1`,
    [slug]
  );

  const design = designResult.rows[0];
  if (!design) return null;

  const children = await fetchAllChildrenForDesignIds([design.id]);
  return attachChildren(design, children);
}

// ─── Children fetch ──────────────────────────────────────────────────────

/**
 * Fetch all active shirts, patches, and prints for a list of design IDs.
 * Single query per medium; never per design (avoids N+1).
 *
 * @param {number[]} designIds
 * @returns {Promise<{shirts: Map, patches: Map, prints: Map}>}
 */
async function fetchAllChildrenForDesignIds(designIds) {
  const [shirtsResult, patchesResult, printsResult] = await Promise.all([
    query(
      `SELECT id, design_id, unit_price_cents, image_url, alt_text
         FROM shirts
        WHERE is_active = TRUE AND design_id = ANY($1::bigint[])`,
      [designIds]
    ),
    query(
      `SELECT id, design_id, unit_price_cents, image_url, alt_text, size_label
         FROM patches
        WHERE is_active = TRUE AND design_id = ANY($1::bigint[])`,
      [designIds]
    ),
    query(
      `SELECT id, design_id, unit_price_cents, image_url, alt_text, size_label
         FROM prints
        WHERE is_active = TRUE AND design_id = ANY($1::bigint[])`,
      [designIds]
    ),
  ]);

  return {
    shirts:  indexByDesignId(shirtsResult.rows),
    patches: indexByDesignId(patchesResult.rows),
    prints:  indexByDesignId(printsResult.rows),
  };
}

function indexByDesignId(rows) {
  const map = new Map();
  for (const row of rows) map.set(Number(row.design_id), row);
  return map;
}

function attachChildren(design, children) {
  const id = Number(design.id);
  return {
    id,
    slug: design.slug,
    name: design.name,
    short_description: design.short_description,
    long_description: design.long_description,
    image_url: design.image_url,
    alt_text: design.alt_text,
    display_order: design.display_order,
    shirt: toShirtDTO(children.shirts.get(id)),
    patch: toPatchOrPrintDTO(children.patches.get(id)),
    print: toPatchOrPrintDTO(children.prints.get(id)),
  };
}

function toShirtDTO(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    unit_price_cents: row.unit_price_cents,
    image_url: row.image_url,
    alt_text: row.alt_text,
  };
}

function toPatchOrPrintDTO(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    unit_price_cents: row.unit_price_cents,
    image_url: row.image_url,
    alt_text: row.alt_text,
    size_label: row.size_label,
  };
}

// ─── Slug validation (shared with routes) ────────────────────────────────

/**
 * Validate a slug against the safe URL-segment format.
 * Used by routes before hitting the DB.
 */
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 80;
