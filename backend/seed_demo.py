"""Seed a demo tenant + admin user for dashboard development.

Idempotent: re-running updates the password/role instead of duplicating.
Usage: .\\.venv\\Scripts\\python.exe seed_demo.py
Login: admin@aryorithm.com / Admin123!
"""

import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401  (register tables for create_all)
from app.models.user import Tenant, TenantTier, User, UserRole
from app.utils.security import hash_password

DEMO_EMAIL = "admin@aryorithm.com"
DEMO_PASSWORD = "Admin123!"
DEMO_NAME = "Demo Admin"
DEMO_TENANT = "Aryorithm Demo"


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == DEMO_EMAIL))
        user = result.scalar_one_or_none()
        if user is None:
            tenant = Tenant(name=DEMO_TENANT, tier=TenantTier.ENTERPRISE)
            db.add(tenant)
            await db.flush()
            user = User(
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                name=DEMO_NAME,
                role=UserRole.TENANT_ADMIN,
                tenant_id=tenant.id,
            )
            db.add(user)
            print(f"Created demo user {DEMO_EMAIL}")
        else:
            user.password_hash = hash_password(DEMO_PASSWORD)
            user.is_active = True
            user.role = UserRole.TENANT_ADMIN
            print(f"Reset password for existing user {DEMO_EMAIL}")
        await db.flush()
        # Pre-populate baseline threat models per GET /api/v1/models spec.
        from app.services.model_inventory import ensure_default_models

        await ensure_default_models(db, user.tenant_id)
        await db.commit()
    print(f"Login with: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    asyncio.run(main())
