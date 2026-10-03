"""Seed Part 4 dummy data (twins, resilience, MDR, dispatches). Idempotent."""

import asyncio
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401
from app.models.range import EmergencyDispatch, MDRIncident, MDRMessage, RangeInstance, ResilienceEvaluation
from app.models.user import User


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == "admin@aryorithm.com"))).scalar_one_or_none()
        if user is None:
            raise SystemExit("Demo user missing — run seed_demo.py first.")
        tid = user.tenant_id
        now = datetime.now(timezone.utc)

        row = (await db.execute(
            select(RangeInstance).where(
                RangeInstance.tenant_id == tid, RangeInstance.instance_id == "INST-TWIN-89104")
        )).scalar_one_or_none()
        if row is None:
            db.add(RangeInstance(
                instance_id="INST-TWIN-89104", blueprint_id="TWIN-SUBSTATION-ALPHA",
                enclave_name="Virtual Substation 01 Twin", status="RUNNING", polls=3,
                assigned_ip="10.240.0.1", traffic_profile="OMNIFLOW_SCADA_DEFAULT",
                expires_at=now + timedelta(hours=2), tenant_id=tid))
            print("SEED instance INST-TWIN-89104")

        db.add(ResilienceEvaluation(
            score=98.4, mttfi_ms=38.4, latency_us=0.84,
            rollback_latency_ms=120.0, evaluated_at=now, tenant_id=tid))
        print("SEED resilience evaluation")

        for iid, sev, site, proto, summary, analyst, verdict, status, mins, contained in [
            ("MDR-INC-2026-081", "CRITICAL", "Substation-Alpha-North", "MODBUS_TCP",
             "Unauthorized coil override on Register 105 (Turbine Cooling Relief)",
             "Lukas Weber (Lead Kernel Engineer)", "CONFIRMED_MALICIOUS_RECONNAISSANCE",
             "TRIAGED_CONTAINED", 42, 1),
            ("MDR-INC-2026-082", "HIGH", "Metro-General-Hospital", "DICOM",
             "After-hours PACS bulk transfer to external endpoint",
             "Sofia Kallas (Hardware Trust Lead)", "UNDER_INVESTIGATION",
             "OPEN", 130, None),
        ]:
            row = (await db.execute(
                select(MDRIncident).where(MDRIncident.incident_id == iid)
            )).scalar_one_or_none()
            if row is None:
                db.add(MDRIncident(
                    incident_id=iid, severity=sev, target_site=site, protocol=proto,
                    threat_summary=summary, assigned_analyst=analyst,
                    analyst_verdict=verdict, status=status,
                    contained_at=(now - timedelta(minutes=contained)) if contained is not None else None,
                    created_at=now - timedelta(minutes=mins), tenant_id=tid))
                db.add(MDRMessage(
                    incident_id=iid, author="Lukas Weber (Lead Kernel Engineer)",
                    author_role="analyst",
                    body="Kernel drop verified at 0.84µs; coil write never reached the PLC. Holding for site confirmation.",
                    tenant_id=tid))
                print(f"SEED incident {iid}")

        for did, enclave, urgency, secs, mins in [
            ("DISPATCH-RED-4398", "CRITICAL_OT_SUBSTATION_01", "PHYSICAL_SAFETY_RISK", 480, 190),
            ("DISPATCH-RED-4399", "HOSPITAL_PACS_ZONE", "ACTIVE_RANSOMWARE_SPREAD", None, 35),
        ]:
            row = (await db.execute(
                select(EmergencyDispatch).where(EmergencyDispatch.dispatch_id == did)
            )).scalar_one_or_none()
            if row is None:
                db.add(EmergencyDispatch(
                    dispatch_id=did, affected_enclave=enclave, urgency=urgency,
                    notes="Seeded drill dispatch for SLA history.",
                    responders=["Bram Visser (Principal SCADA Architect)",
                                "Sofia Kallas (Hardware Trust Lead)"],
                    response_time_seconds=secs,
                    created_at=now - timedelta(minutes=mins), tenant_id=tid))
                print(f"SEED dispatch {did}")

        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
