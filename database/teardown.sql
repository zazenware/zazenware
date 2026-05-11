-- =============================================================================
-- zazenware — teardown.sql
-- =============================================================================
-- Drops every object schema.sql creates. Use only in local development.
-- Safe to run on an empty database (every DROP uses IF EXISTS).
-- =============================================================================

DROP TABLE    IF EXISTS order_items         CASCADE;
DROP TABLE    IF EXISTS orders              CASCADE;
DROP TABLE    IF EXISTS contact_submissions CASCADE;
DROP TABLE    IF EXISTS shirts              CASCADE;
DROP TABLE    IF EXISTS patches             CASCADE;
DROP TABLE    IF EXISTS prints              CASCADE;
DROP TABLE    IF EXISTS designs             CASCADE;
DROP SEQUENCE IF EXISTS zw_order_seq;
DROP FUNCTION IF EXISTS assign_order_number() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()      CASCADE;

-- =============================================================================
-- Done. Database is empty and ready for `psql -f schema.sql`.
-- =============================================================================
