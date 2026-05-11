// =============================================================================
// zazenware — routes/designs.routes.js
// =============================================================================
// GET /api/designs
//   Returns active designs with their active children.
//   200 { designs: [...] }
//
// GET /api/designs/:slug
//   Returns one design + its children.
//   200 { design: {...} }
//   400 if slug malformed
//   404 if no active design with that slug
//
// Cache: short public cache (60s) on listings — keeps things snappy without
// risking stale catalog after a swap-out.
// =============================================================================

import { Router } from "express";

import {
  listActiveDesigns,
  getActiveDesignBySlug,
  SLUG_REGEX,
  SLUG_MAX_LENGTH,
} from "../services/designs.service.js";

import { errors } from "../middleware/errors.js";

export const designsRouter = Router();

// ─── GET /api/designs ─────────────────────────────────────────────────────
designsRouter.get("/designs", async (_req, res, next) => {
  try {
    const designs = await listActiveDesigns();
    res
      .set("Cache-Control", "public, max-age=60")
      .json({ designs });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/designs/:slug ───────────────────────────────────────────────
designsRouter.get("/designs/:slug", async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (
      typeof slug !== "string" ||
      slug.length === 0 ||
      slug.length > SLUG_MAX_LENGTH ||
      !SLUG_REGEX.test(slug)
    ) {
      throw errors.badRequest("Invalid slug format.", ["slug"]);
    }

    const design = await getActiveDesignBySlug(slug);
    if (!design) {
      throw errors.notFound(`No active design with slug "${slug}".`);
    }

    res
      .set("Cache-Control", "public, max-age=60")
      .json({ design });
  } catch (err) {
    next(err);
  }
});
