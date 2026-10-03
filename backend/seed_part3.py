"""Seed Part 3 dummy data (CPS verticals, identity, forensics). Idempotent."""

import asyncio
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401
from app.models.dfir import ITDREvent, MedicalScanner, Vessel, ZTNASession
from app.models.threat import ScadaEvent
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

        for sid, name, ae, ip, dept, node in [
            ("DICOM-MRI_DEPT1-10.0.1.50", "Siemens Magnetom 3T MRI Scanner", "MRI_DEPT_01",
             "10.0.1.50", "Radiology Suite B", "NODE-c34b12"),
            ("DICOM-CT_DEPT2-10.0.1.51", "GE Revolution CT Scanner", "CT_DEPT_02",
             "10.0.1.51", "Radiology Suite B", "NODE-c34b12"),
            ("DICOM-XRAY_ER-10.0.1.52", "Philips DigitalDiagnost X-Ray", "XRAY_ER_01",
             "10.0.1.52", "Emergency Ward", "NODE-c34b12"),
        ]:
            row = (await db.execute(
                select(MedicalScanner).where(MedicalScanner.scanner_id == sid)
            )).scalar_one_or_none()
            if row is None:
                db.add(MedicalScanner(
                    scanner_id=sid, name=name, ae_title=ae, ip_address=ip,
                    department=dept, node_node_id=node, updated_at=now, tenant_id=tid))
                print(f"SEED scanner {sid}")

        for node, proto, plc, attacker, fc, reg, mitre, mins in [
            ("NODE-c34b12", "DICOM", "10.0.1.50", "198.51.100.99",
             "C-STORE bulk transfer", None, "T1048 (Exfiltration Over Alternative Protocol)", 8),
            ("NODE-c34b12", "DICOM", "10.0.1.51", "198.51.100.99",
             "C-STORE bulk transfer", None, "T1048 (Exfiltration Over Alternative Protocol)", 55),
        ]:
            db.add(ScadaEvent(
                node_node_id=node, site="Metro-General-Hospital", protocol=proto,
                plc_ip=plc, attacker_ip=attacker, function_code=fc,
                register_address=reg, mitre_id=mitre, action="XDP_DROP",
                mitigation_time_us=0.88,
                ts=now - timedelta(minutes=mins), tenant_id=tid))
        print("SEED dicom events (2)")

        for mmsi, name, vtype, lat, lng, link, bw, node, spoof in [
            ("244123456", "MV Atlantic Sentinel", "CONTAINER_CARRIER", 51.95, 4.12,
             "SATCOM_INMARSAT_NOMINAL", 4210.5, "NODE-MARITIME-04", False),
            ("244654321", "NV Nordic Shield", "PATROL_VESSEL", 59.44, 24.75,
             "SATCOM_IRIDIUM_DEGRADED", 1874.2, "NODE-MARITIME-07", True),
            ("244789012", "SS Harbor Pilot", "PILOT_BOAT", 51.90, 4.05,
             "SATCOM_INMARSAT_NOMINAL", 640.8, "NODE-MARITIME-04", False),
        ]:
            row = (await db.execute(
                select(Vessel).where(Vessel.vessel_mmsi == mmsi)
            )).scalar_one_or_none()
            if row is None:
                db.add(Vessel(
                    vessel_mmsi=mmsi, vessel_name=name, vessel_type=vtype,
                    current_lat=lat, current_lng=lng, satellite_link_status=link,
                    bandwidth_saved_mb=bw, node_node_id=node, spoofing_detected=spoof,
                    updated_at=now, tenant_id=tid))
                print(f"SEED vessel {mmsi} {name}")

        for iid, target, attacker, tech, mitre, enc, status, action in [
            ("ITDR-4402", "svc_sql_admin", "192.168.1.144", "KERBEROASTING_SPN_SWEEP",
             "T1558.003 (Steal or Forge Kerberos Tickets)", "RC4_HMAC_MD5",
             "BLOCKED_IN_KERNEL", "Reset service account password and enforce AES-256 Kerberos keys."),
            ("ITDR-4403", "service_backup@corp.internal", "192.168.1.146", "IMPOSSIBLE_TRAVEL_VELOCITY",
             "T1078 (Valid Accounts)", "AES256_CTS_HMAC_SHA1",
             "BLOCKED_IN_KERNEL", "Revoke sessions and require step-up MFA."),
        ]:
            row = (await db.execute(
                select(ITDREvent).where(ITDREvent.incident_id == iid)
            )).scalar_one_or_none()
            if row is None:
                db.add(ITDREvent(
                    incident_id=iid, targeted_user=target, attacker_ip=attacker,
                    attack_technique=tech, mitre_id=mitre, encryption=enc,
                    status=status, recommended_action=action,
                    timestamp=now - timedelta(minutes=20), tenant_id=tid))
                print(f"SEED itdr {iid}")

        for email, score, factors, enclaves, quar in [
            ("operator_4@eurogrid.nl", 0.92,
             ["Impossible travel: Amsterdam -> Singapore in 120s (Velocity: 5,200 km/h)",
              "Login from non-attested hardware (Zero TPM quote verified)"],
             ["CRITICAL_OT_SUBSTATION_01"], True),
            ("soc.analyst@eurogrid.nl", 0.34,
             ["New device enrollment (managed laptop, Stockholm)"],
             ["DEFAULT_DMZ"], False),
            ("plant.op@eurogrid.nl", 0.12, [], ["CRITICAL_OT_SUBSTATION_01"], False),
        ]:
            row = (await db.execute(
                select(ZTNASession).where(
                    ZTNASession.tenant_id == tid, ZTNASession.user_email == email)
            )).scalar_one_or_none()
            if row is None:
                db.add(ZTNASession(
                    user_email=email, risk_score=score, factors=factors,
                    enclaves=enclaves, quarantined=quar,
                    timestamp=now - timedelta(minutes=10), tenant_id=tid))
                print(f"SEED ztna {email}")

        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
