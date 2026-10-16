# Aryorithm — aryorithm.com frontend & backend monorepo

One login, three sites, one API. This repo holds the public website, the fleet
dashboard, the extension hub, and the FastAPI backend that powers them all.

| Project | Lives at (prod) | Local dev | What it is |
|---|---|---|---|
| [`main/`](./main/) | https://aryorithm.com | `PORT=3002 npm run dev` | Marketing + docs site, member profile, shared-SSO bridge page |
| [`dashboard/`](./dashboard/) | https://app.aryorithm.com | `npm run dev` (:3000) | Fleet admin console (the auth home: login/register live here) |
| [`hub/`](./hub/) | https://hub.aryorithm.com | `PORT=3001 npm run dev` | Extension marketplace: plugins, `.spkg` packages, PCAP vault, SLAB datasets, twin scenarios, model vault |
| [`backend/`](./backend/) | https://backend.aryorithm.com | `uvicorn app.main:app` (:8000) | FastAPI API (62 tables; SQLite dev, MySQL 8 prod) |
| [`downloader/`](./downloader/) | tooling only | — | Hugging Face model harvest scripts (feeds the model vault) |

MySQL (local user-space 8.0.44): `/home/kami/mysql/` — socket `mysql.sock`, port `3307`, start with `/home/kami/mysql/start-mysql.sh`. Canonical database: `aryorithm`.

## Quick start (local)

```bash
# 1. database
/home/kami/mysql/start-mysql.sh

# 2. backend (uses backend/.env → local MySQL)
/home/kami/aryorithm.com-frontend/backend $ .venv/bin/python -m uvicorn app.main:app --port 8000

# 3. frontends (each in its own terminal; ports must not collide)
/home/kami/aryorithm.com-frontend/dashboard $ npm run dev            # :3000
/home/kami/aryorithm.com-frontend/hub $ PORT=3001 npm run dev       # :3001
/home/kami/aryorithm.com-frontend/main $ PORT=3002 npm run dev      # :3002
```

Fresh machine with no shell history? Open `http://localhost:8000/install` —
the installer wizard writes `.env`, creates all tables, and seeds the admin
account plus catalogs.

## Single sign-on

Login once (on any of the three sites) → logged in everywhere; logout
anywhere → logged out everywhere. Two cooperating layers, both documented in
[`docs/SSO.md`](./docs/SSO.md):
- **HttpOnly session cookies** (`ary_access` / `ary_refresh` on `.aryorithm.com`)
  set by the backend; every frontend sends `credentials: "include"`.
- **Shared token store**: hidden-iframe bridge at `/auth-bridge` (served by
  `main/`) holding the one token copy all three apps read.

## Production builds (your workflow: build locally, upload)

```bash
npm run build:prod   # in dashboard/, hub/, main/ — stashes .env.local,
                     # bakes backend.aryorithm.com, restores .env.local
```

Watch each build log for `Environments: .env.production` (no `.env.local`)
and `[next.config] backend API base: https://backend.aryorithm.com/api/v1`.
Upload everything **except** `.env.local`, `node_modules`, `.next/cache`,
then `npm ci` + start/restart. Never upload `.env.local` — it silently
overrides production. Full rules in [`docs/ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md).

Backend deploys separately (cPanel Setup Python App): create the MySQL DB
(`utf8mb4_unicode_ci`), import `backend/aryorithm_mysql.sql`, set `.env`
(`SECRET_KEY`, `DATABASE_URL`, `COOKIE_DOMAIN=.aryorithm.com`, `CORS_ORIGINS`),
restart. Tables also self-create on boot.

## Docs

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system map, request flows, commercial catalog locations
- [`docs/ENVIRONMENTS.md`](./docs/ENVIRONMENTS.md) — env-file precedence, build model, localhost-leak rules
- [`docs/SSO.md`](./docs/SSO.md) — one-login design, cookie + bridge layers, testing, troubleshooting
- [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — host runbook + verification checklists
- [`backend/ROUTES.md`](./backend/ROUTES.md) — every API route, auth matrix, test handbook
- [`backend/CPANEL_MYSQL.md`](./backend/CPANEL_MYSQL.md) — MySQL setup, transfer guide, 1366 fix
- [`backend/HUB_PACKAGES.md`](./backend/HUB_PACKAGES.md) — `.spkg` catalog schema & display mapping
- Project READMEs: [`backend/`](./backend/README.md) · [`dashboard/`](./dashboard/README.md) · [`hub/`](./hub/README.md) · [`main/`](./main/README.md) · [`downloader/`](./downloader/README.md)
