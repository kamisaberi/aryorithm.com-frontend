"""Seed Part 2 dummy data (compliance records). Idempotent.

Usage: PYTHONPATH=. .venv/bin/python seed_part2.py
"""

import asyncio
import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401 (register tables for create_all)
from app.models.compliance import ComplianceFramework, ComplianceRecord
from app.models.user import User
from app.routers.compliance import _ensure_compliance_schema


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _ensure_compliance_schema()

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == "admin@aryorithm.com"))).scalar_one_or_none()
        if user is None:
            raise SystemExit("Demo user missing — run seed_demo.py first.")
        now = datetime.now(timezone.utc)
        for fw, score, status in [
            (ComplianceFramework.NIS2, 100.0, "COMPLIANT"),
            (ComplianceFramework.CMMC, 100.0, "COMPLIANT"),
        ]:
            row = (await db.execute(
                select(ComplianceRecord).where(
                    ComplianceRecord.tenant_id == user.tenant_id,
                    ComplianceRecord.framework == fw,
                )
            )).scalar_one_or_none()
            if row is None:
                db.add(ComplianceRecord(
                    framework=fw, compliant=True, score_pct=score,
                    status=status, findings={"seeded": True},
                    verified_at=now, tenant_id=user.tenant_id))
                print(f"SEED compliance {fw.value}")
        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
