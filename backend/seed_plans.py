"""Seed the commercial subscription catalog (idempotent).

Usage: PYTHONPATH=. .venv/bin/python seed_plans.py
"""

import asyncio
import sys

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401 (register tables for create_all)
from app.models.subscription import PlanEntitlement, SubscriptionPlan
from app.services.plan_catalog import ensure_plan_seed


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        await ensure_plan_seed(db)
        await db.commit()

    async with AsyncSessionLocal() as db:
        n_plans = len((await db.execute(select(SubscriptionPlan))).scalars().all())
        n_items = len((await db.execute(select(PlanEntitlement))).scalars().all())
    print(f"Plans: {n_plans}, entitlements: {n_items}")


if __name__ == "__main__":
    asyncio.run(main())
