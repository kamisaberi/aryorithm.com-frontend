# Aryorithm Backend API

FastAPI backend for Aryorithm Technologies SaaS platform.

## Quick Start

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8000
```

## Docker

```bash
docker-compose up -d
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database

Uses SQLite by default (`aryorithm.db` in project root). The database file is created automatically on startup.

Fresh server / cPanel with no shell? Open the installer wizard instead —
`GET /install` in a browser — fill DB name/user/password + admin account,
and it writes `.env`, creates tables and seeds initial data (see `ROUTES.md`
§15). No manual file editing needed.

To use a different database, update `DATABASE_URL` in `.env`:
- SQLite: `sqlite+aiosqlite:///./aryorithm.db`
- PostgreSQL: `postgresql+asyncpg://user:pass@localhost:5432/aryorithm`
- MySQL 8+: `mysql+aiomysql://user:pass@localhost:3306/aryorithm?charset=utf8mb4`
  (see `CPANEL_MYSQL.md` for server setup, cPanel import, and data transfer)

Hub production-blueprint and official-appliance tables are created
automatically on startup when using `Base.metadata.create_all`. To
pre-provision an existing MySQL database, import the idempotent DDL in
`migrations/2026_10_27_hub_blueprints_appliances.sql`.

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py            # Settings
│   ├── database.py          # DB engine & sessions
│   ├── dependencies.py      # Shared dependencies
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic schemas
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic
│   └── utils/               # Utilities
├── tests/                   # Test suite
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```
