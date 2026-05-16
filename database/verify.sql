-- =============================================================================
-- zazenware — verify.sql
-- =============================================================================
-- Diagnostic queries to confirm schema + seed are healthy.
-- Run with:
--   psql zazenware -f database/verify.sql
-- =============================================================================

\echo '--- TABLES (should be 7) ---'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


\echo ''
\echo '--- DESIGNS (10 rows, all active) ---'
SELECT id, slug, name, display_order, is_active
FROM designs
ORDER BY display_order;


\echo ''
\echo '--- SHIRTS (10 rows, all priced $25 = 2500c) ---'
SELECT s.id, d.slug, s.unit_price_cents, s.is_active
FROM shirts s
JOIN designs d ON d.id = s.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- PATCHES (10 rows, all priced $10 = 1000c) ---'
SELECT p.id, d.slug, p.unit_price_cents, p.size_label, p.is_active
FROM patches p
JOIN designs d ON d.id = p.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- PRINTS (10 rows, all priced $10 = 1000c) ---'
SELECT p.id, d.slug, p.unit_price_cents, p.size_label, p.is_active
FROM prints p
JOIN designs d ON d.id = p.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- ALL 10 DESIGNS — MEDIUM AVAILABILITY (all should show yes/yes/yes) ---'
SELECT
  d.slug,
  d.name,
  CASE WHEN s.id  IS NOT NULL THEN 'yes' ELSE '—' END AS shirt,
  CASE WHEN pa.id IS NOT NULL THEN 'yes' ELSE '—' END AS patch,
  CASE WHEN pr.id IS NOT NULL THEN 'yes' ELSE '—' END AS print
FROM designs d
LEFT JOIN shirts  s  ON s.design_id  = d.id AND s.is_active
LEFT JOIN patches pa ON pa.design_id = d.id AND pa.is_active
LEFT JOIN prints  pr ON pr.design_id = d.id AND pr.is_active
ORDER BY d.display_order;


\echo ''
\echo '--- IMAGE PATHS (confirm no typos) ---'
SELECT d.slug, d.image_url AS design_img, s.image_url AS shirt_img
FROM designs d
LEFT JOIN shirts s ON s.design_id = d.id
ORDER BY d.display_order;


\echo ''
\echo '--- ORDER NUMBER SEQUENCE ---'
SELECT * FROM pg_sequences WHERE sequencename = 'zw_order_seq';


\echo ''
\echo '--- HEALTH SUMMARY (expected: 10/10/10/10/0/0/0) ---'
SELECT
  (SELECT count(*) FROM designs)             AS designs,
  (SELECT count(*) FROM shirts)              AS shirts,
  (SELECT count(*) FROM patches)             AS patches,
  (SELECT count(*) FROM prints)              AS prints,
  (SELECT count(*) FROM orders)              AS orders,
  (SELECT count(*) FROM order_items)         AS order_items,
  (SELECT count(*) FROM contact_submissions) AS contact_submissions;
