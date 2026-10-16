# Environments & build model

The single most expensive lesson in this repo: **env files decide which
backend your build talks to, and mistakes are silent.** Rules below are
load-bearing — every localhost-leak incident traced back to one of them.

## Backend (pydantic-settings)

Precedence: real environment > `.env` > code defaults. There is only one
file (`.env`, git-ignored; `.env.example` is the template). Key vars:

| Var | Dev (`backend/.env`) | Prod (host `.env`) |
|---|---|---|
| `DATABASE_URL` | `mysql+aiomysql://root@127.0.0.1:3307/aryorithm?charset=utf8mb4` | `mysql+aiomysql://USER:PASS@localhost:3306/DB?charset=utf8mb4` |
| `SECRET_KEY` | any long random | long random, never committed |
| `COOKIE_DOMAIN` | empty (host-only localhost cookies) | `.aryorithm.com` (shared SSO) |
| `CORS_ORIGINS` | JSON list incl. `localhost:3000/3001/3002` | + `https://aryorithm.com`, `https://app…`, `https://hub…` |
| `APP_ENV` / `DEBUG` | `development` / `true` | `production` / `false` |

Settings load once at process start — **always restart the backend app**
after editing `.env` (cPanel: Setup Python App → Restart).

## Frontends (Next.js)

`NEXT_PUBLIC_*` values are **frozen into client JS at `next build` time**;
server code (`next start`, rewrites, server components) reads env **at
process start**. Consequences:

1. Changing any `.env*` requires a rebuild (client) and/or restart (server).
2. File precedence: real env > `.env.{development,production}.local` >
   `.env.local` > `.env.{production,development}` > `.env`.
   A leftover `.env.local` **silently wins over everything** — this caused
   every "still calls localhost" incident to date.
3. The sanctioned workflow is `npm run build:prod` (all three apps): it
   stashes `.env*.local` into memory, builds, restores them. Two lines in
   the build log prove the bake — both must be right before uploading:
   - `Environments: .env.production` (`.env.local` must NOT appear)
   - `[next.config] backend API base: https://backend.aryorithm.com/api/v1`

## Per-app env map

| App | Dev default (no files) | Prod file (committed) | Must never upload |
|---|---|---|---|
| dashboard | `localhost:8000` (+dev Nexus key/tenant) | `.env.production` → `backend.aryorithm.com` | `.env.local` |
| hub | `localhost:8000`, dashboard `:3000`, main `:3002` | `.env.production` → prod hosts | `.env.local` |
| main | `localhost:8000`, dashboard `:3000`, hub `:3001` | `.env.production` → prod hosts | `.env.local` |

Local dev needs **no** env files (built-in localhost defaults); an optional
git-ignored `.env.local` overrides them. Upload set per app: `.next/`,
`public/`, `package.json` + lockfile, `next.config.*`, `.env.production`
— then `npm ci` + start/restart on the host.

## Debugging checklist (prod calls localhost)

1. `grep -rl localhost:8000 .next/static/chunks/` on the **build machine**:
   hits are expected (dev-fallback literals) — the proof is the two build-log
   lines above, not grep.
2. Browser DevTools → Network → full request URL of any API call.
3. Host: `ls -la .env*` — a `.env.local` there overrides production.
4. Host app restarted after the last build/env change? (`next start` reads
   env once.)
5. Backend CORS: preflight from the frontend origin must return
   `access-control-allow-origin` (curl an `OPTIONS` request to check).
