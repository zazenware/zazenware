# database

PostgreSQL 15+ (you're on 18.3 — perfect). Single source of truth for all persisted state.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Creates every table, constraint, index, sequence, and trigger. Idempotent — drops first, then re-creates. |
| `seed.sql` | Populates 5 placeholder designs with shirt/patch/print children. Idempotent — truncates first. |
| `teardown.sql` | Drops everything. Useful when starting from scratch. |
| `verify.sql` | Diagnostic queries to confirm setup is healthy. Read-only. |
| `migrations/` | Future incremental changes after launch. Empty for now. |

## One-time setup

```bash
# 1. Make sure Postgres is running
pg_isready

# 2. Create the database
createdb zazenware

# 3. Apply schema
psql zazenware -f database/schema.sql

# 4. Apply seed
psql zazenware -f database/seed.sql

# 5. Verify
psql zazenware -f database/verify.sql
```

You should see a health summary at the end like:

```
 designs | shirts | patches | prints | orders | order_items | contact_submissions
---------+--------+---------+--------+--------+-------------+---------------------
       5 |      5 |       4 |      3 |      0 |           0 |                   0
```

## Resetting during development

```bash
# Drop everything and rebuild
psql zazenware -f database/teardown.sql
psql zazenware -f database/schema.sql
psql zazenware -f database/seed.sql
```

Or in one command:

```bash
psql zazenware -f database/schema.sql -f database/seed.sql
```

(schema.sql drops first internally, so you don't strictly need teardown.sql.)

## DBeaver setup

1. Open DBeaver.
2. Database → New Database Connection → PostgreSQL.
3. Host: `localhost`, Port: `5432`, Database: `zazenware`, Username: your local user (often your OS username on Linux), Password: blank if using peer auth, otherwise whatever you set.
4. Test connection. If it fails, see "Authentication troubleshooting" below.
5. Browse: `zazenware → Schemas → public → Tables`. You should see 7 tables.

## Authentication troubleshooting

On Linux with peer-auth Postgres (the default on Arch/Garuda), you may need:

```bash
# Become postgres user once to set up your role
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER your_os_username WITH SUPERUSER;
\q
```

Then `createdb zazenware` from your normal shell will work without sudo.

## Important conventions

- **All money in integer cents.** `unit_price_cents`, `subtotal_cents`, `total_cents`, etc. Never floats.
- **Province codes are 2-letter ISO.** `ON`, `QC`, `BC`, `AB`, `MB`, `SK`, `NS`, `NB`, `NL`, `PE`, `YT`, `NT`, `NU`.
- **Country is fixed to `CA`** by CHECK constraint. International shipping is deferred.
- **Order numbers** are auto-assigned by a `BEFORE INSERT` trigger using the `zw_order_seq` sequence: `ZW-YYYY-NNNNNN`.
- **Status workflows are manual.** Operator updates `orders.status` and `contact_submissions.status` directly in DBeaver. No admin UI in MVP1.

## Operator workflows (in DBeaver)

### Mark an order as paid

```sql
UPDATE orders SET status = 'paid' WHERE order_number = 'ZW-2026-000001';
```

### Mark a contact submission as read

```sql
UPDATE contact_submissions SET status = 'read' WHERE id = 1;
```

### Hide a product from the site

```sql
UPDATE shirts SET is_active = FALSE WHERE design_id = (SELECT id FROM designs WHERE slug = 'dysphoria');
```

### Bring it back

```sql
UPDATE shirts SET is_active = TRUE WHERE design_id = (SELECT id FROM designs WHERE slug = 'dysphoria');
```
