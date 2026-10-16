"""Mint developer API tokens for hub testing (prints each raw key ONCE).

Tokens authenticate as ``Authorization: Bearer <key>`` on the universal
publish endpoint (needs the ``packages:publish`` scope, included by
default) and as ``Authorization: ApiKey <key>`` on the legacy registry.

Usage (from backend/):
    PYTHONPATH=. .venv/bin/python tools/mint_dev_tokens.py --email dev@example.com
    PYTHONPATH=. .venv/bin/python tools/mint_dev_tokens.py --email dev@example.com \\
        --count 3 --name ci-token --scopes packages:publish --days 30

Targets the database in ``.env`` (override with --database-url). Creates the
user if the email is unknown (password: DevPass123!, change it).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))


async def main() -> int:
    parser = argparse.ArgumentParser(description="Mint hub developer API tokens")
    parser.add_argument("--email", required=True, help="Owner account email")
    parser.add_argument("--count", type=int, default=2)
    parser.add_argument("--name", default="dev-token")
    parser.add_argument("--scopes", default="packages:publish,packages:validate")
    parser.add_argument("--days", type=int, default=365, help="Expiry in days (0 = never)")
    parser.add_argument("--database-url", default=None)
    args = parser.parse_args()

    if args.database_url:
        import os

        os.environ["DATABASE_URL"] = args.database_url

    from sqlalchemy import select
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    import app.models  # noqa: F401
    from app.config import settings
    from app.database import Base
    from app.models.user import Tenant, TenantTier, User, UserRole
    from app.models.hub import HubApiToken
    from app.services import hub_service as hub
    from app.utils.security import hash_password

    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    scopes = [s.strip() for s in args.scopes.split(",") if s.strip()]
    async with factory() as db:
        user = (
            await db.execute(select(User).where(User.email == args.email))
        ).scalar_one_or_none()
        if user is None:
            tenant = Tenant(name="Dev Tokens", tier=TenantTier.STARTER)
            db.add(tenant)
            await db.flush()
            user = User(
                email=args.email,
                password_hash=hash_password("DevPass123!"),
                name="Dev",
                role=UserRole.TENANT_ADMIN,
                tenant_id=tenant.id,
            )
            db.add(user)
            await db.flush()
            print(f"created user {args.email} (password DevPass123!)")
        now = datetime.now(timezone.utc)
        expires = None if args.days <= 0 else now + timedelta(days=args.days)
        for i in range(max(args.count, 1)):
            raw = hub.new_api_key()
            row = HubApiToken(
                token_id=hub.new_token_id(),
                name=f"{args.name}-{i + 1}" if args.count > 1 else args.name,
                key_prefix=raw[:16],
                key_hash=hashlib.sha256(raw.encode()).hexdigest(),
                scopes=list(scopes),
                user_id=user.id,
                expires_at=expires,
            )
            db.add(row)
            await db.flush()
            print(f"token {row.token_id} scopes={','.join(scopes)}")
            print(f"  Authorization: Bearer {raw}")
        await db.commit()
    await engine.dispose()
    print("Store the keys now — they are never shown again.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
