# database

PostgreSQL 15+. Single source of truth for all persisted state.

## Files

- `schema.sql` — table definitions, constraints, indexes, sequences. **Applied first.** *(Added in epic E-05.)*
- `seed.sql` — placeholder seed data for the 5–7 launch designs. **Applied after schema.** *(Added in epic E-05.)*

## Local setup

```bash
# 1. Make sure Postgres is running
pg_isready

# 2. Create the database
createdb zazenware

# 3. Apply schema (when E-05 lands)
psql zazenware -f schema.sql

# 4. Apply seed (when E-05 lands)
psql zazenware -f seed.sql

# 5. Verify
psql zazenware -c "SELECT COUNT(*) FROM designs WHERE is_active = true;"
```

## Inspection

Use DBeaver or `psql zazenware`. The Master Spec § 13 documents every table and column.

## Important

- All monetary fields are **integer cents** (e.g., `2500` = $25.00 CAD).
- Order numbers follow the format `ZW-YYYY-NNNNNN` and are auto-assigned.
- Operator workflows live in DBeaver (no admin UI in MVP1).
