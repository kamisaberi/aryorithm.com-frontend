# System architecture

```
                    aryorithm.com (:3002) ─────┐
  aryorithm.com            │  static marketing, /profile, /auth-bridge (SSO store)
  app.aryorithm.com (:3000) ───┤  fleet console = AUTH HOME (/login, /register)
  hub.aryorithm.com (:3001) ───┘  marketplace + library catalogs
                        │  fetch + credentials:"include"
                        ▼
  backend.aryorithm.com (:8000)  FastAPI · /api/v1/* · /install · /health
                        │  aiomysql / aiosqlite
                        ▼
              MySQL 8 (prod) · SQLite (dev file / tests :memory:)
```

## Deployables & ports

| Piece | Prod host | Local | Notes |
|---|---|---|---|
| backend | cPanel Setup Python App (`passenger_wsgi.py`, entry `application`) | `:8000` via uvicorn | `lifespan` creates missing tables on boot |
| dashboard | Node app, `next start` | `:3000` (`npm run dev`) | `/` → 307 → `/dashboard` (middleware) |
| hub | Node app, `next start` (or `node server.js`) | `:3001` | dynamic `[slug]` pages SSR on demand |
| main | Node app, `next start` | `:3002` | marketing + `/profile` + `/auth-bridge` |
| MySQL | cPanel MySQL / VPS | `127.0.0.1:3307`, root/no-pass (dev only) | data dir `/home/kami/mysql/data` |

Each frontend owns its port — main on `:3000` shadows the dashboard and its
`/login` 404s. The table above is the contract; the three `README`s repeat it.

## Request flows

- **Reads**: frontend → `GET /api/v1/...` → backend → MySQL. Hub catalogs
  (`/hub/*`, `/model-vault`, `/plans`) are public; everything else needs the
  member JWT (header) or SSO cookie.
- **Writes**: JWT or admin-gated (`get_current_admin` → 403). Registry
  publishing uses CLI `ApiKey` tokens with scopes (`packages:publish`).
- **Downloads**: binaries stream from on-disk vaults
  (`storage/packages/…`, `storage/model-vault/…`) with `Content-Disposition`
  + `X-Checksum-SHA256` (+ `X-Aryorithm-Signature-Ed25519` for models).
- **Uploads**: `POST /hub/publish` (universal: package/pcap/dataset/model,
  Ed25519-signed) and the legacy `POST /registry/publish` (`.splugin`-only).

## Database (62 tables)

Auth & tenancy (`users`, `tenants`, `refresh_tokens`, `hub_api_tokens`),
fleet (`nodes`, `nexus_instances`, `sensors`, `enclaves`…), threats
(`global_threats`, `scada_events`, `ransomware_hashes`…), AI
(`models`, `ota_rollouts`, `compile_tasks`, `trism_*`), compliance, DFIR,
range/MDR dispatches, settings/billing, **commercial catalog**
(`subscription_plans`, `plan_entitlements`), **hub**
(`hub_plugins*`, `sentinel_packages`, `hub_pcaps`, `hub_datasets`,
`hub_scenarios`), **model vault** (`ai_models*`), misc metrics.

Conventions: portable column types only (no Postgres-isms — `TEXT[]` is JSON,
enums are native `ENUM` on MySQL), naive datetimes, additive migrations via
`ensure_*` helpers (never Alembic, never destructive). Fresh tables always
inherit `utf8mb4` (dump DDL pins it; the installer self-heals latin1 DBs).

## Commercial catalog (pricing source of truth)

`backend/app/services/plan_catalog.py` — 4 plans + 101 entitlement rows
(8 tiers + 7 sub-rows, 26 subsystems, 31 industrial plugins, 29 SaaS incl.
hub-registry; IR row retained by decision). Served live at `GET /api/v1/plans`
(+ admin `PATCH`), mirrored by hand into `main/data/subscription-matrix.ts`
for the pricing page (which adds the static `.spkg` + AI-model sections and
dynamic counts). Update flow: edit `plan_catalog.py` → run `seed_plans.py`
against each DB → regenerate `aryorithm_mysql.sql` → update the main mirror →
rebuild main. Dashboard subscriptions page reads the live matrix, no mirror.

## Test layout

Backend: `pytest tests/` — 92 passed (isolated in-memory SQLite by default;
`TEST_DATABASE_URL=…` runs the same suite against MySQL; a few live-DB tests
gate behind `MYSQL_CHARSET_TEST_URL`). Frontends: `tsc --noEmit` + `next lint`
+ `npm run build:prod`; dev smoke via `curl` page checks.
