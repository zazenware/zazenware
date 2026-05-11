# backend

Node.js v20 + Express + PostgreSQL.

## Authority

This service is the **authoritative source** for:

- product prices
- product availability (`is_active`)
- order totals (subtotal, bundle discount, shipping, tax, total)
- order numbers
- order status (`pending_payment`, `paid`, `fulfilled`, `cancelled`)
- contact submission status
- email send status

The frontend may estimate any of these for preview purposes. The backend's value is the only one persisted, emailed, or displayed on the confirmation page.

## Run locally

```bash
npm install
cp .env.example .env       # then edit .env
npm run dev                # runs on http://localhost:4000
```

Health check: `curl http://localhost:4000/api/health`.

## Folder structure

| Path | Contents |
|---|---|
| `src/server.js` | Process entry. Boots the Express app. |
| `src/app.js` | Express app configuration (middleware, route mounting). |
| `src/lib/db.js` | Postgres connection pool (single instance per process). |
| `src/routes/` | Route handlers (one file per resource). |
| `src/services/` | Business logic (pricing, email, etc). |
| `src/middleware/` | Cross-cutting middleware (errors, validation helpers). |

## Conventions

- ESM only (`"type": "module"` in package.json).
- All monetary values are **integer cents**. Never `parseFloat` currency.
- All errors leave a route as `next(err)`, never as a sent response.
- Errors return JSON: `{ "error": { "code": "kebab_case", "message": "Plain English", "fields": [...] } }`.
