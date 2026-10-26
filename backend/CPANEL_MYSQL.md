# MySQL Setup, Conversion & cPanel Transfer Guide

> **This machine (Oct 2026):** a user-space MySQL 8.0.44 already runs from
> persistent disk — no `sudo`/install needed. Data dir `/home/kami/mysql/data`,
> socket `/home/kami/mysql/mysql.sock`, port `3307`, root with no password
> (dev only). After a reboot, start it with:
>
> ```bash
> /home/kami/mysql/start-mysql.sh        # start (background)
> /home/kami/mysql/start-mysql.sh stop   # clean shutdown
> ```
>
> Canonical migrated database: `aryorithm` (fresh copy of `aryorithm.db`,
> 64 tables / 357 rows, verified identical). `backend/.env` already points
> at it, so `uvicorn app.main:app` runs on MySQL out of the box.
> Test database: `aryorithm_test`
> (`TEST_DATABASE_URL="mysql+aiomysql://root@127.0.0.1:3307/aryorithm_test?charset=utf8mb4"`).
> NOTE: `/tmp` on this box is tmpfs — do NOT keep MySQL data there (an old
> copy under `/tmp/opencode` was relocated to `/home/kami/mysql` for this
> reason).

This covers: (1) installing MySQL on the dev machine, (2) what changed in
the backend for MySQL support, (3) moving the database to cPanel with data.

---

## Part 1 — Install MySQL on Ubuntu (run these yourself)

The agent has no sudo access, so run these in your own terminal:

```bash
# 1. Install MySQL 8 server + client
sudo apt update
sudo apt install -y mysql-server mysql-client

# 2. Verify it runs
sudo systemctl status mysql --no-pager | head -n 5
mysql --version   # expect 8.0.x

# 3. Harden (answer the prompts: set a root password, remove anonymous
#    users, disallow remote root, remove test DB, reload privileges)
sudo mysql_secure_installation

# 4. Create the app database with the correct charset (Unicode €/µ safe)
sudo mysql -u root -p -e "CREATE DATABASE aryorithm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; SHOW DATABASES;"

# 5. Point the backend at it (backend/.env)
DATABASE_URL="mysql+aiomysql://root:YOUR_PASSWORD@127.0.0.1:3306/aryorithm?charset=utf8mb4"

# 6. Install Python deps + run (tables auto-create on startup)
cd backend
.venv/bin/pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --port 8000
```

Requirements: MySQL **8.0+** (native `JSON` columns are used) and a database
created with `utf8mb4_unicode_ci` collation. MariaDB 10.6+ also works.

---

## Part 2 — Backend conversion (already done, summary)

- `requirements.txt`: added `aiomysql==0.3.2` (pure-Python async driver).
- `app/config.py`: `DATABASE_URL` documented for both backends.
- `app/database.py`: `pool_pre_ping=True` + `pool_recycle=3600` (survives
  hosts that kill idle connections; harmless on SQLite).
- Models: no changes needed — all 64 tables use portable types
  (`VARCHAR/TEXT/INTEGER/FLOAT/DATETIME/BOOLEAN/JSON/natural ENUMs`).
  One real bug found by the transfer check and fixed:
  `threat.py: mitre_id String(32) → String(64)` on three tables
  (the app itself writes 46-char values like
  `T1048 (Exfiltration Over Alternative Protocol)`).
- Behavior notes: `LIKE`/`ilike()` search is case-insensitive on MySQL
  natively; naive datetimes are stored (same as SQLite — the code already
  normalizes this); `tests/conftest.py` accepts `TEST_DATABASE_URL` so CI
  can run the suite against MySQL (71/71 green on MySQL 8.0.44 and SQLite).

Verified end-to-end on a real MySQL 8.0.44: dump import, 357/357 rows
identical across all tables, app boot + register/login + catalog reads,
and the full pytest suite.

---

## Part 2a — Hub blueprints + official appliance tables (Oct 2026)

The production-blueprint / official-appliance API adds two tables:

| Table | Purpose |
|---|---|
| `hub_blueprints` | Signed `.blueprint` bundles for `/api/v1/hub/blueprints` |
| `hub_appliance_releases` | Authority-signed `.aryopack` releases for `/api/v1/hub/appliances` |

They are created automatically on app startup (`Base.metadata.create_all`).
To pre-provision an existing MySQL/cPanel database — or to apply the change
without restarting — import the idempotent migration:

```bash
cd backend
mysql -u USER -p DBNAME < migrations/2026_10_27_hub_blueprints_appliances.sql
```

Or in cPanel: **phpMyAdmin → select DB → Import →** choose the file → **Go**.
The script uses `CREATE TABLE IF NOT EXISTS`, so running it twice is safe.

Add these settings to the deployed `.env`:

```ini
HUB_BLUEPRINTS_DIR=storage/hub/blueprints
HUB_APPLIANCES_DIR=storage/hub/appliances
HUB_APPLIANCE_MAX_UPLOAD_BYTES=2147483648

# Verify key for official .aryopack uploads. Empty falls back to
# ARYORITHM_MASTER_PUBLIC_KEY_B64 (or LICENSE_KEY_FILE).
ARYORITHM_AUTHORITY_PUBLIC_KEY_B64=
```

Security rules enforced by the API:

- Blueprint publishing uses a JWT or Hub API token with
  `packages:publish`; only the author or an admin can yank one.
- `.aryopack` publish/delete is **super_admin only** and every upload's
  Ed25519 `authority_signature` is verified against the Authority root
  before the file is stored. Non-admins receive `403`, bad signatures `422`.

Generate a dev Authority keypair if needed:

```bash
PYTHONPATH=. .venv/bin/python tools/licensing/generate_keys.py
# put the printed public key in ARYORITHM_MASTER_PUBLIC_KEY_B64
# (or ARYORITHM_AUTHORITY_PUBLIC_KEY_B64) and keep the private key offline
```

---

## Part 3 — Transfer the database to cPanel (with all data)

You need: the file `backend/aryorithm_mysql.sql` (regenerate anytime with
`tools/transfer_mysql.py`, see bottom) + cPanel access.

### Step 1 — Create the database in cPanel

1. cPanel → **MySQL Databases**.
2. Create database, e.g. `kami_aryorithm`. **Important:** set its collation to
   `utf8mb4_unicode_ci` (shown in the database list; change via phpMyAdmin
   → database → Operations → Collation if needed).
   If you skipped this and the installer fails with
   `DataError 1366 "Incorrect string value"` on the first non-ASCII row
   (✔/▸/€): run these in phpMyAdmin → SQL (replace the DB name), then
   re-run the installer — or just re-run it, newer versions self-heal:
   ```sql
   ALTER DATABASE kami_aryorithm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   -- then convert every existing table (safe, keeps all rows):
   -- phpMyAdmin → database → Operations → Collation → utf8mb4_unicode_ci
   -- (+ tick "Change all tables collations").
   ```
3. Create a MySQL user (strong password) and **Add User To Database** with
   **ALL PRIVILEGES**. Note the full names cPanel assigns
   (e.g. user `kami_appuser`, db `kami_aryorithm`).

### Step 2 — Import via phpMyAdmin

1. cPanel → **phpMyAdmin** → click your new (empty) database on the left.
2. Tab **Import** → Choose file `aryorithm_mysql.sql` → **Go**.
3. Expect success Colors green, 64 tables created. The file contains
   `SET FOREIGN_KEY_CHECKS=0/1` around the load, so import order is safe,
   and `DROP TABLE IF EXISTS` per table, so re-importing is idempotent.

### Step 3 — Point the backend at cPanel MySQL

In the deployed backend's `.env`:

```ini
DATABASE_URL="mysql+aiomysql://kami_appuser:YOUR_PASSWORD@localhost:3306/kami_aryorithm?charset=utf8mb4"
```

(On cPanel the MySQL host is `localhost` from the app's perspective.)
Restart the app (Setup Python App → Restart, or `touch passenger_wsgi.py`).
Tables auto-create on startup if ever missing; existing imported data is
left untouched (creation is `IF NOT EXISTS`-style).

### Step 4 — Verify

- `GET /health` returns healthy.
- Log in with an existing user from the imported data.
- Spot-check row counts, e.g. in phpMyAdmin:
  `SELECT COUNT(*) FROM users;` should match the number printed
  when the dump was generated (357 rows total across 64 tables).

### Regenerating / re-transferring later

```bash
cd backend
# Fresh dump from the current SQLite file (for phpMyAdmin import):
.venv/bin/python tools/transfer_mysql.py --dump aryorithm_mysql.sql

# Or copy straight into a live MySQL (VPS, staging):
.venv/bin/python tools/transfer_mysql.py \
  --target "mysql+aiomysql://USER:PASS@HOST:3306/DB?charset=utf8mb4"

# Skip a table if ever needed:
.venv/bin/python tools/transfer_mysql.py --dump out.sql --exclude audit_logs,trism_audit_logs
```

The exporter fails loudly (with table.column) on values MySQL would
truncate or reject — e.g. over-long strings, non-finite floats — instead
of silently corrupting data.
