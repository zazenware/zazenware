// =============================================================================
// zazenware — services/email.service.js
// =============================================================================
// Thin wrapper around the Resend SDK. Builds + sends the order confirmation
// email. Updates orders.email_status on success/failure.
//
// Authority rule (Master Spec § 4.3):
//   Email delivery failure does NOT roll back the order. The DB row stays;
//   email_status records pending → sent → failed for manual retry by operator
//   in DBeaver.
//
// In dev (no Resend domain verified yet):
//   FROM_EMAIL=onboarding@resend.dev
//   REPLY_TO_EMAIL=orders@zazenware.com
//   BCC_EMAIL=orders@zazenware.com (or your real inbox during testing)
//
// In production (E-15, after DNS verification):
//   FROM_EMAIL=orders@zazenware.com
// =============================================================================

import { Resend } from "resend";
import { query } from "../lib/db.js";

const FROM_DEFAULT     = "onboarding@resend.dev";
const REPLY_TO_DEFAULT = "orders@zazenware.com";
const BCC_DEFAULT      = "orders@zazenware.com";
const PAYMENTS_DEFAULT = "payments@zazenware.com";

let resendClient = null;
function getResend() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[zw][email] RESEND_API_KEY not set — emails will be skipped.");
    return null;
  }
  resendClient = new Resend(key);
  return resendClient;
}

/**
 * Send the confirmation email for an order. Updates orders.email_status.
 * Never throws — caller must not rely on email succeeding to consider the
 * order placed.
 */
export async function sendOrderConfirmation(orderId, orderRecord, customerEmail) {
  const resend = getResend();

  // No API key in dev — record skipped and exit quietly
  if (!resend) {
    await markEmailStatus(orderId, "skipped", "No RESEND_API_KEY configured.");
    return { ok: false, reason: "skipped" };
  }

  const FROM     = process.env.FROM_EMAIL     || FROM_DEFAULT;
  const REPLY_TO = process.env.REPLY_TO_EMAIL || REPLY_TO_DEFAULT;
  const BCC      = process.env.BCC_EMAIL      || BCC_DEFAULT;

  const subject = `Order received — ${orderRecord.order_number}`;
  const text    = renderTextBody(orderRecord);
  const html    = renderHtmlBody(orderRecord);

  try {
    const res = await resend.emails.send({
      from: FROM,
      to: [customerEmail],
      bcc: BCC ? [BCC] : undefined,
      reply_to: REPLY_TO,
      subject,
      text,
      html,
    });

    if (res?.error) {
      const reason = res.error.message || JSON.stringify(res.error);
      console.error("[zw][email] Resend returned error:", reason);
      await markEmailStatus(orderId, "failed", reason);
      return { ok: false, reason };
    }

    await markEmailStatus(orderId, "sent", null);
    return { ok: true, id: res?.data?.id || null };
  } catch (err) {
    const reason = err?.message || String(err);
    console.error("[zw][email] Send threw:", reason);
    await markEmailStatus(orderId, "failed", reason);
    return { ok: false, reason };
  }
}

async function markEmailStatus(orderId, status, errorText) {
  try {
    if (status === "sent") {
      await query(
        `UPDATE orders SET email_status = $1, email_sent_at = NOW(), email_error = NULL WHERE id = $2`,
        [status, orderId],
      );
    } else {
      await query(
        `UPDATE orders SET email_status = $1, email_error = $2 WHERE id = $3`,
        [status, errorText ? errorText.slice(0, 1000) : null, orderId],
      );
    }
  } catch (err) {
    console.error("[zw][email] Failed to update email_status:", err.message);
  }
}

// ─── Template ────────────────────────────────────────────────────────────

function formatMoney(cents) {
  if (typeof cents !== "number") return "$0.00";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}$${(abs / 100).toFixed(2)}`;
}

function getSiteUrl() {
  return (process.env.SITE_URL || "http://localhost:5173").replace(/\/$/, "");
}

function getPaymentsEmail() {
  return process.env.PAYMENTS_EMAIL || PAYMENTS_DEFAULT;
}

function renderTextBody(order) {
  const lines = order.items.map(it => {
    const opts = it.size && it.color ? ` (size ${it.size}, ${it.color})` : "";
    return `  - ${it.product_name}${opts} × ${it.quantity}  —  ${formatMoney(it.line_total_cents)}`;
  }).join("\n");

  const bundle = order.bundle_discount_cents > 0
    ? `\nBundle discount (shirt + patch + print): -${formatMoney(order.bundle_discount_cents)}`
    : "";

  const ship = order.shipping_cents === 0
    ? "Shipping: Free (Ontario)"
    : `Shipping: ${formatMoney(order.shipping_cents)}`;

  return `Thanks for your order from zazenware.

Your order number is: ${order.order_number}

Items:
${lines}

Subtotal:                    ${formatMoney(order.subtotal_cents)}${bundle}
${ship}
HST (13%):                   ${formatMoney(order.tax_cents)}
─────────────────────────────────
TOTAL:                       ${formatMoney(order.total_cents)}

────────────────────────────────────────────────
HOW TO PAY
────────────────────────────────────────────────
Send a Canadian Interac e-transfer to:
  ${getPaymentsEmail()}

For the exact amount: ${formatMoney(order.total_cents)}
With your order number in the message: ${order.order_number}

Auto-deposit is enabled — no security question is needed.

────────────────────────────────────────────────
WHAT HAPPENS NEXT
────────────────────────────────────────────────
1. Send the e-transfer above.
2. Once it arrives and is matched to your order number, you'll receive a
   fulfillment email from orders@zazenware.com.
3. Goods are made to order — handling time can take up to ~3 weeks.

View your order online:
${getSiteUrl()}/order-confirmation.html?order=${order.order_number}

Questions? Reply to this email or write to contact@zazenware.com.

— zazenware
`;
}

function renderHtmlBody(order) {
  const itemRows = order.items.map(it => {
    const opts = it.size && it.color
      ? `<div style="font-size: 12px; color: #555;">Size ${escape(it.size)}, ${escape(it.color)}</div>`
      : "";
    return `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd;">
          <div style="font-weight: bold;">${escape(it.product_name)}</div>
          ${opts}
          <div style="font-size: 12px; color: #555;">Qty: ${it.quantity} · ${escape(formatMoney(it.unit_price_cents))} each</div>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #ddd; text-align: right; font-variant-numeric: tabular-nums;">
          ${escape(formatMoney(it.line_total_cents))}
        </td>
      </tr>`;
  }).join("");

  const bundleRow = order.bundle_discount_cents > 0
    ? `<tr><td style="padding: 4px 0;">Bundle discount (shirt + patch + print)</td><td style="padding: 4px 0; text-align: right;">−${escape(formatMoney(order.bundle_discount_cents))}</td></tr>`
    : "";

  const shipText = order.shipping_cents === 0 ? "Free (Ontario)" : formatMoney(order.shipping_cents);

  return `<!doctype html>
<html lang="en">
<body style="font-family: 'Courier New', monospace; color: #111; max-width: 600px; margin: 0 auto; padding: 24px; background: #FFF8E8;">
  <h1 style="font-size: 22px; margin: 0 0 8px 0;">thanks for your order</h1>
  <p style="margin: 0 0 16px 0;">From zazenware. Your order number is:</p>

  <p style="font-size: 28px; font-weight: bold; padding: 12px 16px; background: #B9A1FF; color: #111; border: 2px solid #111; display: inline-block; margin: 0 0 24px 0;">
    ${escape(order.order_number)}
  </p>

  <h2 style="font-size: 16px; margin: 24px 0 8px 0;">Items</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    ${itemRows}
  </table>

  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 4px 0;">Subtotal</td><td style="padding: 4px 0; text-align: right;">${escape(formatMoney(order.subtotal_cents))}</td></tr>
    ${bundleRow}
    <tr><td style="padding: 4px 0;">Shipping</td><td style="padding: 4px 0; text-align: right;">${escape(shipText)}</td></tr>
    <tr><td style="padding: 4px 0;">HST (13%)</td><td style="padding: 4px 0; text-align: right;">${escape(formatMoney(order.tax_cents))}</td></tr>
    <tr style="border-top: 2px solid #111;">
      <td style="padding: 12px 0 4px 0;"><strong>TOTAL</strong></td>
      <td style="padding: 12px 0 4px 0; text-align: right;"><strong style="font-size: 18px;">${escape(formatMoney(order.total_cents))}</strong></td>
    </tr>
  </table>

  <div style="margin-top: 32px; padding: 16px; background: #B9A1FF; border: 2px solid #111;">
    <h2 style="font-size: 18px; margin: 0 0 12px 0;">how to pay</h2>
    <p style="margin: 0 0 8px 0;">Send a Canadian Interac e-transfer to:</p>
    <p style="margin: 0 0 8px 0;"><strong style="font-size: 16px;">${escape(getPaymentsEmail())}</strong></p>
    <p style="margin: 0 0 8px 0;">Amount: <strong>${escape(formatMoney(order.total_cents))}</strong></p>
    <p style="margin: 0 0 8px 0;">Message: include your order number <strong>${escape(order.order_number)}</strong></p>
    <p style="margin: 0; font-size: 14px;">Auto-deposit is on — no security question needed.</p>
  </div>

  <h2 style="font-size: 16px; margin: 24px 0 8px 0;">What happens next</h2>
  <ol style="padding-left: 20px;">
    <li>Send the e-transfer above.</li>
    <li>Once it arrives and is matched to your order number, you'll get a fulfillment email from orders@zazenware.com.</li>
    <li>Goods are made to order — handling can take up to ~3 weeks.</li>
  </ol>

  <p style="margin-top: 24px;">
    <a href="${escape(getSiteUrl())}/order-confirmation.html?order=${escape(order.order_number)}"
       style="color: #6E1E2E; font-weight: bold;">View your order online</a>
  </p>

  <p style="margin-top: 24px; font-size: 14px; color: #555;">
    Questions? Reply to this email or write to contact@zazenware.com.
  </p>

  <p style="margin-top: 32px; font-size: 14px; color: #555;">— zazenware</p>
</body>
</html>`;
}

function escape(s) {
  if (s == null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
