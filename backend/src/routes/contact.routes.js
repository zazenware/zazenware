// =============================================================================
// zazenware — routes/contact.routes.js
// =============================================================================
// POST /api/contact  — Insert a contact submission. Returns 201.
//
//   201 { contact: { id, created_at, received: true } }
//   400 { error: { code, message } }              spam / malformed
//   422 { error: { code, message, fields: [...] }} field errors
//
// No GET endpoint — submissions are read by the operator in DBeaver.
// =============================================================================

import { Router } from "express";
import { createContactSubmission } from "../services/contact.service.js";

export const contactRouter = Router();

contactRouter.post("/contact", async (req, res, next) => {
  try {
    const result = await createContactSubmission(req.body);
    res
      .status(201)
      .set("Cache-Control", "no-store")
      .json({
        contact: {
          id: result.id,
          created_at: result.created_at,
          received: true,
        },
      });
  } catch (err) {
    next(err);
  }
});
