-- =============================================================================
-- zazenware — seed.sql
-- =============================================================================
-- Placeholder seed data. Five designs across various medium combinations.
-- Swap the names / descriptions / image filenames for your real artwork later.
--
-- IMAGES:
--   These reference filenames in /frontend/assets/images/. You can leave these
--   strings as-is during dev (the cards will show broken-image icons until
--   real files exist with those names), or update them to match files you
--   already have.
--
-- ORDER:
--   The display_order column governs the sort. Lower numbers appear first.
--   Designs with the same display_order break tie by id (insert order).
-- =============================================================================

-- ─── Clean any existing seed data (idempotent) ─────────────────────────────
TRUNCATE order_items, orders, contact_submissions, shirts, patches, prints, designs
  RESTART IDENTITY CASCADE;

-- ─── DESIGN 1: Black Sun ───────────────────────────────────────────────────
INSERT INTO designs (slug, name, short_description, long_description, image_url, alt_text, display_order)
VALUES (
  'black-sun',
  'Black Sun',
  'Stippled skull with antlers and a radiating halo.',
  'A skull crowned with antlers, framed by a halo of fine stippled rays. Pen-and-ink intensity, screen-ready.',
  '/assets/images/black-sun-design.jpg',
  'Pen-and-ink illustration of a horned skull haloed by radiating rays.',
  10
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun-shirt.jpg',
  'Black Sun design printed on a t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun-patch.jpg',
  'Black Sun design as a 12x12 inch back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'black-sun'),
  '/assets/images/black-sun-print.jpg',
  'Black Sun design as an 11x17 inch paper print.'
);


-- ─── DESIGN 2: Zazen Skull ─────────────────────────────────────────────────
INSERT INTO designs (slug, name, short_description, long_description, image_url, alt_text, display_order)
VALUES (
  'zazen-skull',
  'Zazen Skull',
  'Blackletter "zazen" wordmark above a dotwork skull.',
  'A clean blackletter "zazen" set above a dot-stipple skull. The original house logo direction.',
  '/assets/images/zazen-skull-design.jpg',
  'Dot-stipple skull with the word "zazen" rendered in blackletter above it.',
  20
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-skull'),
  '/assets/images/zazen-skull-shirt.jpg',
  'Zazen Skull design printed on a t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'zazen-skull'),
  '/assets/images/zazen-skull-patch.jpg',
  'Zazen Skull design as a 12x12 inch back patch.'
);


-- ─── DESIGN 3: Tree Of Roots ───────────────────────────────────────────────
INSERT INTO designs (slug, name, short_description, long_description, image_url, alt_text, display_order)
VALUES (
  'tree-of-roots',
  'Tree of Roots',
  'Sunburst behind a tangled tree with Celtic-knot roots.',
  'High-contrast woodcut energy. A black-and-white sunburst pattern frames a tree whose roots tangle into knotwork.',
  '/assets/images/tree-of-roots-design.jpg',
  'Black and white illustration of a stylized tree with knotwork roots in front of a sunburst.',
  30
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'tree-of-roots'),
  '/assets/images/tree-of-roots-shirt.jpg',
  'Tree of Roots design printed on a t-shirt.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'tree-of-roots'),
  '/assets/images/tree-of-roots-print.jpg',
  'Tree of Roots design as an 11x17 inch paper print.'
);


-- ─── DESIGN 4: Dysphoria ───────────────────────────────────────────────────
INSERT INTO designs (slug, name, short_description, long_description, image_url, alt_text, display_order)
VALUES (
  'dysphoria',
  'Dysphoria',
  'Graffiti-style wordmark, bubble letters with hard outline.',
  'The word "dysphoria" in throwie-style bubble letters. Heavy outline, glossy interior. Looks loud on a black tee.',
  '/assets/images/dysphoria-design.jpg',
  'Graffiti-style bubble lettering reading "dysphoria".',
  40
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria-shirt.jpg',
  'Dysphoria design printed on a t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria-patch.jpg',
  'Dysphoria design as a 12x12 inch back patch.'
);

INSERT INTO prints (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'dysphoria'),
  '/assets/images/dysphoria-print.jpg',
  'Dysphoria design as an 11x17 inch paper print.'
);


-- ─── DESIGN 5: Inverted Zazen ──────────────────────────────────────────────
INSERT INTO designs (slug, name, short_description, long_description, image_url, alt_text, display_order)
VALUES (
  'inverted-zazen',
  'Inverted Zazen',
  'Seated skeleton meditating beneath a haloed sun.',
  'A seated, meditating skeleton inside a haloed sun. Beneath, a layered "zazen" wordmark fans out in three readings.',
  '/assets/images/inverted-zazen-design.jpg',
  'Seated skeleton in lotus pose with a halo, above a triple-layer "zazen" hand-lettering.',
  50
);

INSERT INTO shirts (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'inverted-zazen'),
  '/assets/images/inverted-zazen-shirt.jpg',
  'Inverted Zazen design printed on a t-shirt.'
);

INSERT INTO patches (design_id, image_url, alt_text)
VALUES (
  (SELECT id FROM designs WHERE slug = 'inverted-zazen'),
  '/assets/images/inverted-zazen-patch.jpg',
  'Inverted Zazen design as a 12x12 inch back patch.'
);


-- =============================================================================
-- Sanity-check summary
-- =============================================================================
-- After running this script, the following should be true:
--   designs:             5 rows  (all is_active = true)
--   shirts:              5 rows  (one per design)
--   patches:             4 rows  (all except Tree of Roots)
--   prints:              3 rows  (Black Sun, Tree of Roots, Dysphoria)
--   orders:              0 rows
--   order_items:         0 rows
--   contact_submissions: 0 rows
--
-- Verify with:
--   SELECT count(*) FROM designs;
--   SELECT slug, name, display_order FROM designs ORDER BY display_order;
-- =============================================================================
