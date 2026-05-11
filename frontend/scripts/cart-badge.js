/* ============================================================================
   zazenware — cart-badge.js
   ----------------------------------------------------------------------------
   Reads localStorage 'zw-cart' (JSON array of cart lines) and renders the
   total QUANTITY into [data-zw-cart-badge].

   Master Spec § 10.1 (Cart behavior — badge shows total quantity, not line
   count; empty cart hides the badge).

   Listens for 'zw:cart-updated' so the badge stays in sync when other tabs
   or scripts modify the cart.
   ============================================================================ */

const STORAGE_KEY = "zw-cart";

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function totalQuantity(cart) {
  return cart.reduce((sum, line) => {
    const q = Number(line && line.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? Math.floor(q) : 0);
  }, 0);
}

function render() {
  const badge = document.querySelector("[data-zw-cart-badge]");
  if (!badge) return;

  const cart = readCart();
  const qty = totalQuantity(cart);

  if (qty === 0) {
    badge.hidden = true;
    badge.textContent = "0";
  } else {
    badge.hidden = false;
    badge.textContent = String(qty);
  }

  // Update the parent cart link's aria-label
  const cartLink = badge.closest('[data-nav="cart"]');
  if (cartLink) {
    cartLink.setAttribute(
      "aria-label",
      qty === 1 ? "Cart, 1 item" : `Cart, ${qty} items`,
    );
  }
}

function wire() {
  render();
  // React to other tabs' cart changes
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) render();
  });
  // React to in-page cart updates (cards.js / cart.js will dispatch this)
  document.addEventListener("zw:cart-updated", render);
}

document.addEventListener("zw:partials-ready", wire);
