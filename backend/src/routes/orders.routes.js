// =============================================================================
// zazenware — routes/orders.routes.js
// =============================================================================
// POST /api/orders            — submit a checkout. Server validates and
//                                recalculates everything. Returns 201 with
//                                the authoritative breakdown + order_number.
//
// GET  /api/orders/:order_number — public read for the order confirmation
//                                page. Returns the public DTO (no PII).
//                                404 if not found.
// =============================================================================

import { Router } from "express";
import { createOrder, fetchOrderByNumber } from "../services/orders.service.js";
import { errors } from "../middleware/errors.js";

export const ordersRouter = Router();

// ─── POST /api/orders ─────────────────────────────────────────────────────
ordersRouter.post("/orders", async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      throw errors.badRequest("Request body must be a JSON object.");
    }
    const result = await createOrder(req.body);

    // 201 Created — never cache this response
    res
      .status(201)
      .set("Cache-Control", "no-store")
      .json({ order: result });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/orders/:order_number ────────────────────────────────────────
ordersRouter.get("/orders/:order_number", async (req, res, next) => {
  try {
    const { order_number: orderNumber } = req.params;

    if (typeof orderNumber !== "string" || !/^ZW-\d{4}-\d{6}$/.test(orderNumber)) {
      throw errors.badRequest("Invalid order number format.", ["order_number"]);
    }

    const order = await fetchOrderByNumber(orderNumber);
    if (!order) {
      throw errors.notFound(`No order found with number "${orderNumber}".`);
    }

    res
      .set("Cache-Control", "no-store")
      .json({ order });
  } catch (err) {
    next(err);
  }
});
