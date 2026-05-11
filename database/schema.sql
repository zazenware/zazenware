-- =============================================================================
-- zazenware — schema.sql
-- =============================================================================
-- Full database schema for MVP1.
-- Source of truth: Master Spec v1.2 § 13.
--
-- Conventions:
--   * All monetary values are INTEGER cents. Never floats for currency.
--   * Timestamps use TIMESTAMPTZ (with timezone), defaulted to NOW().
--   * All tables have an is_active boolean for soft-archival (UPSERT via DBeaver).
--   * Status enums are CHECK-constrained text columns (simpler than CREATE TYPE
--     when we may add new values; DBeaver-friendly).
--   * Primary keys use BIGSERIAL for products and orders; UUID could swap in
--     later if collision risk emerges (not relevant at MVP1 scale).
--
-- Idempotency:
--   This script DROPs and re-creates everything. Safe to re-run locally.
--   For production migrations, see database/migrations/.
-- =============================================================================

-- ─── Clean slate (dev only) ────────────────────────────────────────────────
DROP TABLE IF EXISTS order_items         CASCADE;
DROP TABLE IF EXISTS orders              CASCADE;
DROP TABLE IF EXISTS contact_submissions CASCADE;
DROP TABLE IF EXISTS shirts              CASCADE;
DROP TABLE IF EXISTS patches             CASCADE;
DROP TABLE IF EXISTS prints              CASCADE;
DROP TABLE IF EXISTS designs             CASCADE;
DROP SEQUENCE IF EXISTS zw_order_seq;
DROP FUNCTION IF EXISTS assign_order_number() CASCADE;
DROP FUNCTION IF EXISTS set_updated_at()      CASCADE;

-- ─── Shared trigger function: updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- DESIGNS — parent artwork records (non-purchasable on their own)
-- =============================================================================
CREATE TABLE designs (
  id                BIGSERIAL    PRIMARY KEY,
  slug              VARCHAR(80)  NOT NULL UNIQUE,
  name              VARCHAR(120) NOT NULL,
  short_description VARCHAR(280) NOT NULL,
  long_description  TEXT,
  image_url         VARCHAR(500) NOT NULL,
  alt_text          VARCHAR(280) NOT NULL,
  display_order     INTEGER      NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT designs_slug_format
    CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX idx_designs_active_order ON designs (is_active, display_order);

CREATE TRIGGER trg_designs_updated_at
  BEFORE UPDATE ON designs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- SHIRTS — purchasable shirt children of a design
-- =============================================================================
CREATE TABLE shirts (
  id                BIGSERIAL    PRIMARY KEY,
  design_id         BIGINT       NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  unit_price_cents  INTEGER      NOT NULL DEFAULT 2500,
  image_url         VARCHAR(500) NOT NULL,
  alt_text          VARCHAR(280) NOT NULL,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT shirts_price_positive CHECK (unit_price_cents > 0),
  CONSTRAINT shirts_unique_per_design UNIQUE (design_id)
);

CREATE INDEX idx_shirts_active ON shirts (is_active);
CREATE INDEX idx_shirts_design ON shirts (design_id);

CREATE TRIGGER trg_shirts_updated_at
  BEFORE UPDATE ON shirts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- PATCHES — purchasable back-patch children of a design
-- =============================================================================
CREATE TABLE patches (
  id                BIGSERIAL    PRIMARY KEY,
  design_id         BIGINT       NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  unit_price_cents  INTEGER      NOT NULL DEFAULT 1000,
  image_url         VARCHAR(500) NOT NULL,
  alt_text          VARCHAR(280) NOT NULL,
  size_label        VARCHAR(60)  NOT NULL DEFAULT '12x12 in',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT patches_price_positive CHECK (unit_price_cents > 0),
  CONSTRAINT patches_unique_per_design UNIQUE (design_id)
);

CREATE INDEX idx_patches_active ON patches (is_active);
CREATE INDEX idx_patches_design ON patches (design_id);

CREATE TRIGGER trg_patches_updated_at
  BEFORE UPDATE ON patches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- PRINTS — purchasable paper-print children of a design
-- =============================================================================
CREATE TABLE prints (
  id                BIGSERIAL    PRIMARY KEY,
  design_id         BIGINT       NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  unit_price_cents  INTEGER      NOT NULL DEFAULT 1000,
  image_url         VARCHAR(500) NOT NULL,
  alt_text          VARCHAR(280) NOT NULL,
  size_label        VARCHAR(60)  NOT NULL DEFAULT '11x17 in',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT prints_price_positive CHECK (unit_price_cents > 0),
  CONSTRAINT prints_unique_per_design UNIQUE (design_id)
);

CREATE INDEX idx_prints_active ON prints (is_active);
CREATE INDEX idx_prints_design ON prints (design_id);

CREATE TRIGGER trg_prints_updated_at
  BEFORE UPDATE ON prints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- ORDER NUMBER SEQUENCE — ZW-YYYY-NNNNNN
-- =============================================================================
-- One sequence per year would require yearly maintenance. We use a single
-- global sequence and embed the year as a label. NNNNNN is the sequence value
-- zero-padded to 6 digits. Collisions are impossible.
CREATE SEQUENCE zw_order_seq
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  MAXVALUE 999999
  NO CYCLE;

CREATE OR REPLACE FUNCTION assign_order_number() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ZW-'
      || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY')
      || '-'
      || LPAD(nextval('zw_order_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- ORDERS — one row per checkout submission
-- =============================================================================
CREATE TABLE orders (
  id                       BIGSERIAL    PRIMARY KEY,
  order_number             VARCHAR(20)  NOT NULL UNIQUE,

  -- Customer details
  customer_name            VARCHAR(120) NOT NULL,
  customer_email           VARCHAR(254) NOT NULL,
  customer_note            VARCHAR(500),

  -- Shipping address (Canada only, country fixed to CA)
  shipping_full_name       VARCHAR(120) NOT NULL,
  shipping_address_line_1  VARCHAR(200) NOT NULL,
  shipping_address_line_2  VARCHAR(200),
  shipping_city            VARCHAR(100) NOT NULL,
  shipping_province        CHAR(2)      NOT NULL,
  shipping_postal_code     VARCHAR(7)   NOT NULL,
  shipping_country         CHAR(2)      NOT NULL DEFAULT 'CA',

  -- Authoritative money (server-computed)
  subtotal_cents           INTEGER      NOT NULL,
  bundle_discount_cents    INTEGER      NOT NULL DEFAULT 0,
  shipping_cents           INTEGER      NOT NULL,
  tax_rate_bps             INTEGER      NOT NULL DEFAULT 1300,   -- 13.00% HST
  tax_cents                INTEGER      NOT NULL,
  total_cents              INTEGER      NOT NULL,

  -- Lifecycle status
  status                   VARCHAR(20)  NOT NULL DEFAULT 'pending_payment',

  -- Email send status
  email_status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
  email_sent_at            TIMESTAMPTZ,
  email_error              TEXT,

  -- Timestamps
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT orders_order_number_format
    CHECK (order_number ~ '^ZW-[0-9]{4}-[0-9]{6}$'),

  CONSTRAINT orders_email_format
    CHECK (customer_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  CONSTRAINT orders_province_valid
    CHECK (shipping_province IN (
      'ON','QC','BC','AB','MB','SK','NS','NB','NL','PE','YT','NT','NU'
    )),

  CONSTRAINT orders_country_canada_only
    CHECK (shipping_country = 'CA'),

  CONSTRAINT orders_postal_code_format
    CHECK (
      shipping_postal_code ~ '^[A-CEGHJ-NPRSTVXY][0-9][A-CEGHJ-NPRSTV-Z] ?[0-9][A-CEGHJ-NPRSTV-Z][0-9]$'
    ),

  CONSTRAINT orders_status_valid
    CHECK (status IN ('pending_payment','paid','fulfilled','cancelled')),

  CONSTRAINT orders_email_status_valid
    CHECK (email_status IN ('pending','sent','failed','skipped')),

  CONSTRAINT orders_subtotal_non_negative   CHECK (subtotal_cents        >= 0),
  CONSTRAINT orders_bundle_non_negative     CHECK (bundle_discount_cents >= 0),
  CONSTRAINT orders_shipping_non_negative   CHECK (shipping_cents        >= 0),
  CONSTRAINT orders_tax_rate_non_negative   CHECK (tax_rate_bps          >= 0),
  CONSTRAINT orders_tax_non_negative        CHECK (tax_cents             >= 0),
  CONSTRAINT orders_total_non_negative      CHECK (total_cents           >= 0),

  -- Shipping rule sanity:
  -- ON → 0;  any other province → 1000 cents.
  CONSTRAINT orders_shipping_rule_matches_province
    CHECK (
      (shipping_province = 'ON'  AND shipping_cents = 0)
      OR (shipping_province <> 'ON' AND shipping_cents = 1000)
    )
);

CREATE INDEX idx_orders_status        ON orders (status);
CREATE INDEX idx_orders_email_status  ON orders (email_status);
CREATE INDEX idx_orders_created_at    ON orders (created_at DESC);
CREATE INDEX idx_orders_email         ON orders (customer_email);

CREATE TRIGGER trg_orders_assign_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION assign_order_number();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- ORDER_ITEMS — denormalized snapshot of each line on an order
-- =============================================================================
-- These rows freeze the price, name, options, etc. at order time.
-- If a product is later renamed or repriced, historical orders stay correct.
CREATE TABLE order_items (
  id                BIGSERIAL    PRIMARY KEY,
  order_id          BIGINT       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  product_type      VARCHAR(10)  NOT NULL,    -- 'shirt' | 'patch' | 'print'
  product_id        BIGINT       NOT NULL,    -- not a FK (allows soft-deletes upstream)
  design_slug       VARCHAR(80)  NOT NULL,
  product_name      VARCHAR(200) NOT NULL,

  -- Shirt-only options
  shirt_size        VARCHAR(8),
  shirt_color       VARCHAR(20),

  unit_price_cents  INTEGER      NOT NULL,
  quantity          INTEGER      NOT NULL,
  line_total_cents  INTEGER      NOT NULL,
  image_url         VARCHAR(500),

  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT order_items_product_type_valid
    CHECK (product_type IN ('shirt','patch','print')),

  CONSTRAINT order_items_quantity_positive
    CHECK (quantity BETWEEN 1 AND 99),

  CONSTRAINT order_items_unit_price_positive
    CHECK (unit_price_cents > 0),

  CONSTRAINT order_items_line_total_correct
    CHECK (line_total_cents = unit_price_cents * quantity),

  CONSTRAINT order_items_shirt_size_valid
    CHECK (
      shirt_size IS NULL
      OR shirt_size IN ('S','M','L','XL','2XL')
    ),

  CONSTRAINT order_items_shirt_color_valid
    CHECK (
      shirt_color IS NULL
      OR shirt_color IN ('Black','White')
    ),

  CONSTRAINT order_items_shirt_options_only_for_shirts
    CHECK (
      (product_type = 'shirt' AND shirt_size IS NOT NULL AND shirt_color IS NOT NULL)
      OR (product_type IN ('patch','print') AND shirt_size IS NULL AND shirt_color IS NULL)
    )
);

CREATE INDEX idx_order_items_order ON order_items (order_id);


-- =============================================================================
-- CONTACT_SUBMISSIONS — separate from orders
-- =============================================================================
CREATE TABLE contact_submissions (
  id                       BIGSERIAL    PRIMARY KEY,
  name                     VARCHAR(120) NOT NULL,
  email                    VARCHAR(254) NOT NULL,
  inquiry_type             VARCHAR(40)  NOT NULL,
  message                  TEXT         NOT NULL,
  has_artwork_permission   BOOLEAN      NOT NULL DEFAULT FALSE,
  status                   VARCHAR(20)  NOT NULL DEFAULT 'new',
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT contact_inquiry_type_valid
    CHECK (inquiry_type IN (
      'order_question',
      'custom_design_inquiry',
      'band_merch_inquiry',
      'print_existing_design_inquiry',
      'general_question'
    )),

  CONSTRAINT contact_status_valid
    CHECK (status IN ('new','read','replied','archived')),

  CONSTRAINT contact_email_format
    CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  CONSTRAINT contact_message_length
    CHECK (char_length(message) BETWEEN 10 AND 2000),

  -- When inquiry is "print existing design", permission MUST be true.
  CONSTRAINT contact_permission_required_for_print_existing
    CHECK (
      inquiry_type <> 'print_existing_design_inquiry'
      OR has_artwork_permission = TRUE
    )
);

CREATE INDEX idx_contact_status     ON contact_submissions (status);
CREATE INDEX idx_contact_created_at ON contact_submissions (created_at DESC);

CREATE TRIGGER trg_contact_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- =============================================================================
-- Done.
-- =============================================================================
-- Next: run seed.sql to populate placeholder designs.
