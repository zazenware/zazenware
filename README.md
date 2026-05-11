# zazenware

> Artist-run art & merch shop. Browse original designs, buy shirts / patches / prints. Canada-only for MVP1.

This is the source repository for **zazenware.com**.

---

## What's in this repo

| Path | Contents |
|---|---|
| `/frontend` | Vanilla HTML, CSS, and JavaScript. No build step. |
| `/backend` | Node.js + Express API. Connects to PostgreSQL. |
| `/database` | `schema.sql` + `seed.sql` + setup notes. |
| `/docs` | The Master Spec Oracle and supporting documents. |

---

## Stack

- **Frontend:** vanilla HTML / CSS / JS, served statically (Netlify in production)
- **Backend:** Node.js v20 LTS, Express, `pg` driver
- **Database:** PostgreSQL 15+
- **Email:** Resend (transactional only)
- **Domain:** zazenware.com (Namecheap)
- **Email hosting:** Namecheap Pro Email (3 mailboxes)

The full architecture lives in `docs/oracle/Zazenware_MVP1_Master_Spec_v1_2.docx`.

---

## Requirements

- Node.js **v20 LTS** (run `nvm use` to match `.nvmrc`)
- PostgreSQL **15+** running locally
- npm 10+
- A modern browser

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/zazenware.git
cd zazenware
nvm use
```

### 2. Set up the database

```bash
# Create the database
createdb zazenware

# Apply schema + seed
cd database
psql zazenware -f schema.sql
psql zazenware -f seed.sql
cd ..
```

See `database/README.md` for details.

### 3. Set up the backend

```bash
cd backend
npm install
cp .env.example .env     # then edit .env with your local values
npm run dev              # runs on http://localhost:4000
```

Health check: open http://localhost:4000/api/health — should return `{"status":"ok","db":"ok"}`.

### 4. Set up the frontend

```bash
cd frontend
npm install
npm run dev              # runs on http://localhost:5173
```

Open http://localhost:5173 in your browser.

---

## Licensing

This project uses **two licenses**:

- `LICENSE` — MIT, covers source code (everything except `/frontend/assets/images/`)
- `LICENSE-ART` — All Rights Reserved, covers all original artwork in `/frontend/assets/images/`

The code is open source. The artwork is not. Please respect both.

---

## Project status

**MVP1 build in progress.** Phase 1 (skeleton) complete. See `docs/planning/Zazenware_MVP1_Feature_Backlog_v1_0.docx` for the full epic list and current phase.

---

## Contact

- Order questions: orders@zazenware.com
- General contact: contact@zazenware.com
- E-transfer payments: payments@zazenware.com (when ordering)

---

© 2026 zazenware
