# database/migrations

Empty for now. After production launch, schema changes go here as incremental SQL files instead of editing `schema.sql` directly.

## Naming convention (when we start)

```
0001-add-product-detail-pages.sql
0002-add-stripe-payment-fields.sql
```

Files run in alphabetical order. Each file:

1. Wraps changes in a `BEGIN; ... COMMIT;` transaction
2. Uses `IF NOT EXISTS` / `IF EXISTS` so it's safe to re-run
3. Has a comment block at the top describing what it does and why

## During MVP1

Just keep editing `schema.sql` directly. Migrations matter once real customer data exists.
