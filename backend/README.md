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
