"""cPanel / Passenger entry point for the Aryorithm backend (FastAPI).

Shared hosting (cPanel "Setup Python App") speaks WSGI, while this project
is ASGI (FastAPI). This file adapts one to the other and exposes the
``application`` callable Passenger imports.

Deploy steps (cPanel):
  1. cPanel → Setup Python App → Create application (Python 3.10+;
     Application root = the folder containing this file, e.g.
     ``aryorithm-backend``; Application URL = your API subdomain/path).
  2. Upload the project, then install dependencies into the app venv.
     In cPanel Terminal (or SSH), with the app venv active:
         pip install -r requirements.txt
  3. Create ``.env`` next to this file (copy ``.env.example``) and set at
     minimum ``SECRET_KEY`` and ``DATABASE_URL``. For cPanel MySQL, see
     ``CPANEL_MYSQL.md``:
         DATABASE_URL="mysql+aiomysql://USER:PASS@localhost:3306/DB?charset=utf8mb4"
  4. Set the **Application startup file** to ``passenger_wsgi.py`` and the
     **Application Entry point** to ``application``, then (Re)start the app.

Notes:
  * The working directory is forced to this file's folder so relative paths
    (``.env``, ``aryorithm.db``, ``storage/``, ``tools/``) resolve exactly
    like local ``uvicorn`` runs. Do NOT move this file into a subfolder.
  * FastAPI ``lifespan`` startup does NOT run under Passenger. Table
    creation (normally done there) is performed once below, guarded: if the
    database is unreachable the import still succeeds and the failure will
    surface per-request instead of killing the whole app silently.
  * Streaming/SSE endpoints work but shared hosts may buffer or time out
    long-lived responses; prefer short polls there.
"""

import asyncio
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Passenger workers may start anywhere; pin CWD to the project root so
# relative paths (.env, sqlite file, storage/, tools/) keep working.
os.chdir(BASE_DIR)

from a2wsgi import ASGIMiddleware  # noqa: E402  (after sys.path fix)

from app.main import app as fastapi_app  # noqa: E402
from app.database import Base, engine  # noqa: E402


def _ensure_tables() -> None:
    """Create missing tables (lifespan equivalent for Passenger)."""

    async def _create() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    try:
        asyncio.run(_create())
    except Exception as exc:  # noqa: BLE001 — boot must not die on DB outage
        print(f"[passenger_wsgi] WARNING: table check skipped ({exc!r})", file=sys.stderr)


_ensure_tables()

application = ASGIMiddleware(fastapi_app)
