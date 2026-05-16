-- =============================================================================
-- zazenware — seed.sql
-- =============================================================================
-- 10 real designs. Every design gets a shirt, a patch, and a print.
--
-- Image path convention:
--   Design / patch / print : /assets/images/{slug}/{slug}-design.png
--   Shirt (black default)  : /assets/images/{slug}/{slug}-shirt-black.png
--   Shirt (white, via JS)  : /assets/images/{slug}/{slug}-shirt-white.png
--     ↑ The white URL is constructed client-side in cards.js on colour select.
--       Only the black URL is stored in the DB as the default image_url.
--
-- Descriptions are placeholder one-liners — update any time in DBeaver:
--   UPDATE designs SET short_description = '...' WHERE slug = '...';
-- =============================================================================

-- ─── Clean slate (idempotent) ────────────────────────────────────────────
TRUNCATE order_items, orders, contact_submissions, shirts, patches, prints, designs
  RESTART IDENTITY CASCADE;

ALTER SEQUENCE zw_order_seq RESTART WITH 1;


-- =============================================================================
-- DESIGN 1 — Baby Teeth
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'baby-teeth',
  'Baby Teeth',
  'Serrated forms and raw energy.',
  '/assets/images/baby-teeth/baby-teeth-design.png',
  'Baby Teeth design illustration.',
  10
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'baby-teeth'),
  '/assets/images/baby-teeth/baby-teeth-shirt-black.png',
  'Baby Teeth design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'baby-teeth'),
  '/assets/images/baby-teeth/baby-teeth-design.png',
  'Baby Teeth design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'baby-teeth'),
  '/assets/images/baby-teeth/baby-teeth-design.png',
  'Baby Teeth design as a paper print.'
);


-- =============================================================================
-- DESIGN 2 — Black Sun
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'black-sun',
  'Black Sun',
  'Stippled skull with antlers and a radiating halo.',
  '/assets/images/black-sun/black-sun-design.png',
  'Black Sun design illustration.',
  20
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun/black-sun-shirt-black.png',
  'Black Sun design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun/black-sun-design.png',
  'Black Sun design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun/black-sun-design.png',
  'Black Sun design as a paper print.'
);


-- =============================================================================
-- DESIGN 3 — Dysphoria
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'dysphoria',
  'Dysphoria',
  'Graffiti-style wordmark in bold bubble letters.',
  '/assets/images/dysphoria/dysphoria-design.png',
  'Dysphoria design illustration.',
  30
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria/dysphoria-shirt-black.png',
  'Dysphoria design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria/dysphoria-design.png',
  'Dysphoria design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria/dysphoria-design.png',
  'Dysphoria design as a paper print.'
);


-- =============================================================================
-- DESIGN 4 — Heart Altar
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'heart-altar',
  'Heart Altar',
  'Sacred geometry meets punk iconography.',
  '/assets/images/heart-altar/heart-altar-design.png',
  'Heart Altar design illustration.',
  40
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'heart-altar'),
  '/assets/images/heart-altar/heart-altar-shirt-black.png',
  'Heart Altar design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'heart-altar'),
  '/assets/images/heart-altar/heart-altar-design.png',
  'Heart Altar design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'heart-altar'),
  '/assets/images/heart-altar/heart-altar-design.png',
  'Heart Altar design as a paper print.'
);


-- =============================================================================
-- DESIGN 5 — Sibling Lost
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'sibling-lost',
  'Sibling Lost',
  'A memorial design in stark black and white.',
  '/assets/images/sibling-lost/sibling-lost-design.png',
  'Sibling Lost design illustration.',
  50
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'sibling-lost'),
  '/assets/images/sibling-lost/sibling-lost-shirt-black.png',
  'Sibling Lost design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'sibling-lost'),
  '/assets/images/sibling-lost/sibling-lost-design.png',
  'Sibling Lost design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'sibling-lost'),
  '/assets/images/sibling-lost/sibling-lost-design.png',
  'Sibling Lost design as a paper print.'
);


-- =============================================================================
-- DESIGN 6 — Skeleton Body
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'skeleton-body',
  'Skeleton Body',
  'Full anatomical skeleton, rendered in detail.',
  '/assets/images/skeleton-body/skeleton-body-design.png',
  'Skeleton Body design illustration.',
  60
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'skeleton-body'),
  '/assets/images/skeleton-body/skeleton-body-shirt-black.png',
  'Skeleton Body design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'skeleton-body'),
  '/assets/images/skeleton-body/skeleton-body-design.png',
  'Skeleton Body design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'skeleton-body'),
  '/assets/images/skeleton-body/skeleton-body-design.png',
  'Skeleton Body design as a paper print.'
);


-- =============================================================================
-- DESIGN 7 — Spore Crown
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'spore-crown',
  'Spore Crown',
  'Organic crown of spores and growth.',
  '/assets/images/spore-crown/spore-crown-design.png',
  'Spore Crown design illustration.',
  70
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'spore-crown'),
  '/assets/images/spore-crown/spore-crown-shirt-black.png',
  'Spore Crown design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'spore-crown'),
  '/assets/images/spore-crown/spore-crown-design.png',
  'Spore Crown design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'spore-crown'),
  '/assets/images/spore-crown/spore-crown-design.png',
  'Spore Crown design as a paper print.'
);


-- =============================================================================
-- DESIGN 8 — Zazen Glyph
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'zazen-glyph',
  'Zazen Glyph',
  'Meditative symbol rendered in bold line.',
  '/assets/images/zazen-glyph/zazen-glyph-design.png',
  'Zazen Glyph design illustration.',
  80
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-glyph'),
  '/assets/images/zazen-glyph/zazen-glyph-shirt-black.png',
  'Zazen Glyph design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-glyph'),
  '/assets/images/zazen-glyph/zazen-glyph-design.png',
  'Zazen Glyph design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-glyph'),
  '/assets/images/zazen-glyph/zazen-glyph-design.png',
  'Zazen Glyph design as a paper print.'
);


-- =============================================================================
-- DESIGN 9 — Zazen Logo
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'zazen-logo',
  'Zazen Logo',
  'The zazenware house mark.',
  '/assets/images/zazen-logo/zazen-logo-design.png',
  'Zazen Logo design illustration.',
  90
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-logo'),
  '/assets/images/zazen-logo/zazen-logo-shirt-black.png',
  'Zazen Logo design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-logo'),
  '/assets/images/zazen-logo/zazen-logo-design.png',
  'Zazen Logo design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-logo'),
  '/assets/images/zazen-logo/zazen-logo-design.png',
  'Zazen Logo design as a paper print.'
);


-- =============================================================================
-- DESIGN 10 — Zazen Tree Roots
-- =============================================================================
INSERT INTO designs (slug, name, short_description, image_url, alt_text, display_order)
VALUES (
  'zazen-tree-roots',
  'Zazen Tree Roots',
  'Roots, branches, and the space between.',
  '/assets/images/zazen-tree-roots/zazen-tree-roots-design.png',
  'Zazen Tree Roots design illustration.',
  100
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-tree-roots'),
  '/assets/images/zazen-tree-roots/zazen-tree-roots-shirt-black.png',
  'Zazen Tree Roots design on a black t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-tree-roots'),
  '/assets/images/zazen-tree-roots/zazen-tree-roots-design.png',
  'Zazen Tree Roots design as a back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-tree-roots'),
  '/assets/images/zazen-tree-roots/zazen-tree-roots-design.png',
  'Zazen Tree Roots design as a paper print.'
);


-- =============================================================================
-- Health summary (run verify.sql to see this in full)
-- =============================================================================
-- Expected after this script:
--   designs:  10 rows (all is_active = true)
--   shirts:   10 rows (unit_price_cents = 2500)
--   patches:  10 rows (unit_price_cents = 1000)
--   prints:   10 rows (unit_price_cents = 1000)
--   orders:    0 rows
--   order_items: 0 rows
--   contact_submissions: 0 rows
-- =============================================================================
