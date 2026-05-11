/* ============================================================================
   zazenware — checkout.js
   ----------------------------------------------------------------------------
   Submit a validated checkout payload to POST /api/orders. On 201:
     1. Clear the localStorage cart.
     2. Redirect to /order-confirmation.html?order=<order_number>.

   On error:
     - 400/422 with field errors → render inline + return to caller to refresh form.
     - Other status → render generic banner.

   This module exports submitOrder() so cart-page.js can call it. Keeping the
   network call separate from form rendering keeps both pieces testable.
   ============================================================================ */

import { ApiError } from "./api.js";
import { clearCart } from "./cart.js";

const ENDPOINT = "/api/orders";

function getApiBase() {
  if (typeof window !== "undefined" && window.ZW_CONFIG?.apiBaseUrl) {
    return String(window.ZW_CONFIG.apiBaseUrl).replace(/\/$/, "");
  }
  return "http://localhost:4000";
}

/**
 * POST the checkout payload. Returns the parsed { order } on success;
 * throws ApiError on failure.
 */
export async function submitOrder(payload) {
  const url = getApiBase() + ENDPOINT;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (_) {
    throw new ApiError({
      status: 0,
      code: "network_error",
      message: "Couldn't reach the server. Check your connection and try again.",
    });
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* non-JSON */ }

  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError({
      status: res.status,
      code: err.code || "http_" + res.status,
      message: err.message || res.statusText || "Order submission failed.",
      fields: err.fields,
    });
  }

  return data;
}

/**
 * Convenience wrapper: submits, clears cart on success, and redirects.
 * Throws on failure so caller can render errors.
 */
export async function submitAndRedirect(payload) {
  const data = await submitOrder(payload);
  const orderNumber = data?.order?.order_number;

  if (!orderNumber) {
    throw new ApiError({
      status: 0,
      code: "bad_response",
      message: "Order created but the response was incomplete. Please check your email.",
    });
  }

  // Clear cart BEFORE redirect so the back button doesn't show a stale cart
  clearCart();

  // Hand off to the confirmation page
  window.location.assign(`/order-confirmation.html?order=${encodeURIComponent(orderNumber)}`);
  return data;
}
