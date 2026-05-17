/* ============================================================================
   zazenware — cart-badge.js
   ----------------------------------------------------------------------------
   Reads localStorage 'zw-cart' and updates the header cart badge.

   Behaviour (Master Spec § 10.1):
   - Badge is hidden (hidden attribute + display:none) when cart is empty.
   - Badge appears with the quantity when cart has ≥ 1 item.
   - The badge element itself is aria-hidden="true" — the count is communicated
     to screen readers via the cart link's aria-label instead.
   - Listens to 'zw:cart-updated' for in-page updates and 'storage' for
     cross-tab changes.
   ============================================================================ */

const STORAGE_KEY = 'zw-cart';

function readCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function totalQuantity(cart) {
  return cart.reduce((sum, line) => {
    const q = Number(line?.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? Math.floor(q) : 0);
  }, 0);
}

function render() {
  const badge    = document.querySelector('[data-zw-cart-badge]');
  const cartLink = document.querySelector('[data-nav="cart"]');
  if (!badge && !cartLink) return;

  const qty = totalQuantity(readCart());

  // Badge: show only when qty ≥ 1
  if (badge) {
    if (qty > 0) {
      badge.textContent = String(qty);
      badge.hidden = false;
    } else {
      badge.textContent = '';
      badge.hidden = true;
    }
  }

  // Cart link aria-label carries the accessible count
  if (cartLink) {
    if (qty === 0) {
      cartLink.setAttribute('aria-label', 'Cart');
    } else if (qty === 1) {
      cartLink.setAttribute('aria-label', 'Cart, 1 item');
    } else {
      cartLink.setAttribute('aria-label', `Cart, ${qty} items`);
    }
  }
}

function wire() {
  render();

  // Cross-tab cart changes
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) render();
  });

  // In-page cart updates dispatched by cart.js / cards.js
  document.addEventListener('zw:cart-updated', render);
}

document.addEventListener('zw:partials-ready', wire);
