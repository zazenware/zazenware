/* ============================================================================
   zazenware — format.js
   ----------------------------------------------------------------------------
   Tiny formatting utilities shared across page scripts.

   Money rule (Master Spec § 5.3): every price is stored as INTEGER CENTS.
   Format only at the display layer.
   ============================================================================ */

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format integer cents as "$XX.XX". */
export function formatMoney(cents) {
  if (typeof cents !== "number" || !Number.isFinite(cents)) return "$0.00";
  return CAD.format(cents / 100);
}

/** Clamp a value to [min, max] and floor to integer. Returns NaN safely. */
export function clampInt(value, min, max) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/**
 * Create a DOM element with attributes + children in one call. Vanilla and
 * minimal — replaces the imperative document.createElement boilerplate.
 *
 *   el("div", { class: "zw-card" }, [
 *     el("h3", {}, ["Title"]),
 *     el("p",  {}, ["Body"]),
 *   ])
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === "class") node.className = v;
    else if (k === "dataset" && typeof v === "object") {
      for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k in node && typeof v === "boolean") {
      node[k] = v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
