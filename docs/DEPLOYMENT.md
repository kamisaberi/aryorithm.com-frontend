# Deployment runbook (web host)

## Backend (cPanel Setup Python App)

1. Create the MySQL database with collation **`utf8mb4_unicode_ci`**
   (phpMyAdmin → database → Operations if you missed it; a latin1 default
   fails the first non-ASCII seed row with error 1366 — newer installers
   self-heal this, but set it right anyway).
2. Create the MySQL user, grant ALL PRIVILEGES on the DB.
3. phpMyAdmin → Import `backend/aryorithm_mysql.sql` (59→62 tables; regenerate
   it from SQLite with `tools/transfer_mysql.py --dump` after any data change).
4. Upload the backend folder; `pip install -r requirements.txt` (Python 3.10+).
5. Create `.env` next to `passenger_wsgi.py`: `SECRET_KEY` (long random),
   `DATABASE_URL="mysql+aiomysql://USER:PASS@localhost:3306/DB?charset=utf8mb4"`,
   `COOKIE_DOMAIN=.aryorithm.com`, full `CORS_ORIGINS`, `APP_ENV=production`,
   `DEBUG=false`. See `backend/.env.example`.
6. Startup file `passenger_wsgi.py`, entry `application` → (Re)start.
7. Verify: `GET /health` → healthy; `GET /install` loads; login works;
   `GET /api/v1/plans` shows the matrix.

No-shell alternative for first setup: open `/install` in a browser (DB
credentials + admin account + seed toggles), then restart once.

## Frontends (Node app per site)

Per app (`dashboard` → app.aryorithm.com, `hub` → hub.aryorithm.com,
`main` → aryorithm.com), on your build PC:

```bash
npm run build:prod   # safe with .env.local present; verify the two log lines
```

Upload: `.next/`, `public/`, `package.json` + lockfile, `next.config.*`,
`.env.production` (+ `server.js` for hub if you use `node server.js`).
**Never** `.env.local`, `node_modules`, `.next/cache`. Then `npm ci` +
start/restart (set `PORT` if the panel needs it).

## Verification checklist (after every deploy)

- [ ] Landing pages 200 on all three domains; no `localhost` in Network URLs.
- [ ] Dashboard `/` → 307 → `/dashboard` (→ `/login` when logged out).
- [ ] Login on one site → avatar/identity on the other two (new tabs).
- [ ] Logout on one site → sessions die everywhere.
- [ ] `OPTIONS` preflight from each frontend origin returns its
      `access-control-allow-origin` (else: host backend CORS + restart).
- [ ] `/api/v1/plans` matrix + hub catalogs return live data.
- [ ] Backend `/health` reports the expected env.

## Rollback notes

- Frontend: re-upload the previous `.next/` (or previous build) and restart —
  client bundles are fully static per build.
- Backend: code is stateless across deploys except DB migrations, which are
  additive-only (`ensure_*` helpers) — downgrading code never loses data.
  `aryorithm.db` (SQLite) stays in repo as backup/dump source; canonical
  runtime data lives in MySQL.
