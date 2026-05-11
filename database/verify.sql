-- =============================================================================
-- zazenware — verify.sql
-- =============================================================================
-- Diagnostic queries you can run after schema.sql + seed.sql to confirm
-- everything is healthy. Each query is annotated with what to expect.
--
-- Run with:
--   psql zazenware -f database/verify.sql
-- =============================================================================

\echo '--- TABLES (should be 7) ---'
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


\echo ''
\echo '--- DESIGNS (5 rows, all active) ---'
SELECT id, slug, name, display_order, is_active
FROM designs
ORDER BY display_order;


\echo ''
\echo '--- SHIRTS (5 rows, all priced $25 = 2500c) ---'
SELECT s.id, d.slug, s.unit_price_cents, s.is_active
FROM shirts s
JOIN designs d ON d.id = s.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- PATCHES (4 rows, all priced $10 = 1000c) ---'
SELECT p.id, d.slug, p.unit_price_cents, p.size_label, p.is_active
FROM patches p
JOIN designs d ON d.id = p.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- PRINTS (3 rows, all priced $10 = 1000c) ---'
SELECT p.id, d.slug, p.unit_price_cents, p.size_label, p.is_active
FROM prints p
JOIN designs d ON d.id = p.design_id
ORDER BY d.display_order;


\echo ''
\echo '--- DESIGNS WITH MEDIUM AVAILABILITY ---'
SELECT
  d.slug,
  d.name,
  CASE WHEN s.id IS NOT NULL THEN 'yes' ELSE '—' END AS shirt,
  CASE WHEN p.id IS NOT NULL THEN 'yes' ELSE '—' END AS patch,
  CASE WHEN pr.id IS NOT NULL THEN 'yes' ELSE '—' END AS print
FROM designs d
LEFT JOIN shirts  s  ON s.design_id  = d.id AND s.is_active
LEFT JOIN patches p  ON p.design_id  = d.id AND p.is_active
LEFT JOIN prints  pr ON pr.design_id = d.id AND pr.is_active
ORDER BY d.display_order;


\echo ''
\echo '--- ORDER NUMBER SEQUENCE (should report last_value=0, is_called=f at first) ---'
SELECT * FROM pg_sequences WHERE sequencename = 'zw_order_seq';


\echo ''
\echo '--- CONSTRAINT NAMES (should be ~20+) ---'
SELECT conname, contype, conrelid::regclass AS on_table
FROM pg_constraint
WHERE conrelid IN ('designs'::regclass,'shirts'::regclass,'patches'::regclass,'prints'::regclass,'orders'::regclass,'order_items'::regclass,'contact_submissions'::regclass)
  AND contype IN ('c','u','f')
ORDER BY on_table::text, conname;


\echo ''
\echo '--- TRIGGERS ---'
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


\echo ''
\echo '--- HEALTH SUMMARY ---'
SELECT
  (SELECT count(*) FROM designs)             AS designs,
  (SELECT count(*) FROM shirts)              AS shirts,
  (SELECT count(*) FROM patches)             AS patches,
  (SELECT count(*) FROM prints)              AS prints,
  (SELECT count(*) FROM orders)              AS orders,
  (SELECT count(*) FROM order_items)         AS order_items,
  (SELECT count(*) FROM contact_submissions) AS contact_submissions;
