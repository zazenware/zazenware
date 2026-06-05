/* ============================================================================
   zazenware — format.js
   ----------------------------------------------------------------------------
   Tiny formatting and DOM utilities shared across frontend page scripts.

   Rules:
     - Money is stored as integer cents.
     - Formatting happens only at the display layer.
     - DOM helper must safely ignore null/undefined/false children.
   ============================================================================ */

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/* ─── Money / numbers ─────────────────────────────────────────────────── */

/** Format cents as Canadian currency. Accepts numbers or numeric strings. */
export function formatMoney(cents) {
  const n = Math.round(Number(cents));

  if (!Number.isFinite(n)) return "$0.00";

  return CAD.format(n / 100);
}

/** Clamp a value to [min, max] and floor to integer. */
export function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  const lo = Math.floor(Number(min));
  const hi = Math.floor(Number(max));

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 0;
  if (!Number.isFinite(n)) return lo;

  return Math.min(Math.max(n, lo), hi);
}

/** Return a safe integer, or fallback if invalid. */
export function toInt(value, fallback = 0) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

/** Return a trimmed string. */
export function cleanString(value) {
  return String(value ?? "").trim();
}

/* ─── DOM helper ──────────────────────────────────────────────────────── */

/**
 * Create a DOM element with attributes and children.
 *
 * Example:
 *   el("article", { class: "zw-card", dataset: { slug: "black-sun" } }, [
 *     el("h3", {}, ["Black Sun"]),
 *     condition ? el("p", {}, ["Available"]) : null,
 *   ]);
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  applyAttrs(node, attrs);
  appendChildren(node, children);

  return node;
}

/** Create a document fragment from children. */
export function fragment(children = []) {
  const frag = document.createDocumentFragment();
  appendChildren(frag, children);
  return frag;
}

/* ─── Private DOM helpers ─────────────────────────────────────────────── */

function applyAttrs(node, attrs) {
  if (!attrs || typeof attrs !== "object") return;

  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;

    if (key === "class" || key === "className") {
      node.className = String(value);
      continue;
    }

    if (key === "dataset" && isPlainObject(value)) {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        if (dataValue !== false && dataValue !== null && dataValue !== undefined) {
          node.dataset[dataKey] = String(dataValue);
        }
      }
      continue;
    }

    if (key === "style" && isPlainObject(value)) {
      for (const [prop, styleValue] of Object.entries(value)) {
        if (styleValue !== false && styleValue !== null && styleValue !== undefined) {
          node.style[prop] = String(styleValue);
        }
      }
      continue;
    }

    if (key === "style") {
      node.setAttribute("style", String(value));
      continue;
    }

    if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(eventName(key), value);
      continue;
    }

    if (value === true) {
      node.setAttribute(key, "");
      continue;
    }

    if (key in node && isSafeDomProperty(key)) {
      try {
        node[key] = value;
      } catch (_) {
        node.setAttribute(key, String(value));
      }
      continue;
    }

    node.setAttribute(key, String(value));
  }
}

function appendChildren(parent, children) {
  for (const child of flatten(children)) {
    if (child === null || child === undefined || child === false) continue;

    if (child instanceof Node) {
      parent.append(child);
    } else {
      parent.append(document.createTextNode(String(child)));
    }
  }
}

function flatten(value) {
  return Array.isArray(value) ? value.flat(Infinity) : [value];
}

function eventName(key) {
  return key.slice(2).toLowerCase();
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Avoid assigning weird DOM props accidentally.
 * Most attrs should stay as attributes; these are safe/useful property cases.
 */
function isSafeDomProperty(key) {
  return [
    "value",
    "checked",
    "selected",
    "disabled",
    "hidden",
    "required",
    "readOnly",
    "multiple",
    "textContent",
    "innerText",
    "type",
    "name",
    "id",
    "href",
    "src",
    "alt",
    "title",
  ].includes(key);
}