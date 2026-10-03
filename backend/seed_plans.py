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
from app.services.plan_catalog import ITEMS, PLANS


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        plans = {p.slug: p for p in (await db.execute(select(SubscriptionPlan))).scalars()}
        for i, p in enumerate(PLANS):
            if p["slug"] in plans:
                row = plans[p["slug"]]
                for k, v in p.items():
                    setattr(row, k, v)
                row.sort_order = i
            else:
                db.add(SubscriptionPlan(**{**p, "sort_order": i}))
        rows = {(r.category, r.item_key): r for r in (await db.execute(select(PlanEntitlement))).scalars()}
        for i, item in enumerate(ITEMS):
            key = (item["category"], item["item_key"])
            if key in rows:
                row = rows[key]
                row.item_label = item["item_label"]
                row.item_sub = item["item_sub"]
                row.values = item["values"]
                row.sort_order = i
            else:
                db.add(PlanEntitlement(**{**item, "sort_order": i}))
        await db.commit()

    async with AsyncSessionLocal() as db:
        n_plans = len((await db.execute(select(SubscriptionPlan))).scalars().all())
        n_items = len((await db.execute(select(PlanEntitlement))).scalars().all())
    print(f"Plans: {n_plans}, entitlements: {n_items}")


if __name__ == "__main__":
    asyncio.run(main())
