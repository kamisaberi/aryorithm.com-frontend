# MySQL Setup, Conversion & cPanel Transfer Guide

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
- Models: no changes needed — all 59 tables use portable types
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

## Part 3 — Transfer the database to cPanel (with all data)

You need: the file `backend/aryorithm_mysql.sql` (regenerate anytime with
`tools/transfer_mysql.py`, see bottom) + cPanel access.

### Step 1 — Create the database in cPanel

1. cPanel → **MySQL Databases**.
2. Create database, e.g. `kami_aryorithm`. **Important:** set its collation to
   `utf8mb4_unicode_ci` (shown in the database list; change via phpMyAdmin
   → database → Operations → Collation if needed).
3. Create a MySQL user (strong password) and **Add User To Database** with
   **ALL PRIVILEGES**. Note the full names cPanel assigns
   (e.g. user `kami_appuser`, db `kami_aryorithm`).

### Step 2 — Import via phpMyAdmin

1. cPanel → **phpMyAdmin** → click your new (empty) database on the left.
2. Tab **Import** → Choose file `aryorithm_mysql.sql` → **Go**.
3. Expect success Colors green, 59 tables created. The file contains
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
  when the dump was generated (357 rows total across 59 tables).

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
