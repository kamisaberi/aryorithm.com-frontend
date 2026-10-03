"""Seed Part 1 dummy data (fleet + threat intel). Idempotent.

Usage: PYTHONPATH=. .venv/bin/python seed_part1.py
Seeds into the demo tenant (admin@aryorithm.com) + global threat rows.
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
import app.models  # noqa: F401 (register tables for create_all)
from app.models.fleet import Enclave, Node
from app.models.threat import GlobalThreat, RansomwareHash, ScadaEvent
from app.models.user import User
from app.services.fleet_topology import ensure_topology_schema

DEMO_EMAIL = "admin@aryorithm.com"


def utcnow():
    return datetime.now(timezone.utc)


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_topology_schema()

    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == DEMO_EMAIL))).scalar_one_or_none()
        if user is None:
            raise SystemExit(f"Demo user {DEMO_EMAIL} missing — run seed_demo.py first.")
        tid = user.tenant_id
        now = utcnow()

        # --- enclaves ---
        for gid, name, desc, sla, scada in [
            ("CRITICAL_OT", "Critical OT", "Industrial SCADA and high-voltage electrical protection", 800, True),
            ("HOSPITAL_PACS", "Hospital PACS", "DICOM inspection active for radiology networks", 500, False),
            ("DEFAULT_DMZ", "Enterprise DMZ", "Public-facing corporate web and API gateways", 1000, False),
        ]:
            row = (await db.execute(
                select(Enclave).where(Enclave.tenant_id == tid, Enclave.enclave_id == gid)
            )).scalar_one_or_none()
            if row is None:
                db.add(Enclave(enclave_id=gid, name=name, description=desc,
                               max_latency_us=sla, scada_mode=scada, tenant_id=tid))
                print(f"SEED enclave {gid}")
            else:
                row.description = desc
                row.max_latency_us = sla
                row.scada_mode = scada

        # --- node telemetry (Service 1 fields) ---
        telemetry = {
            "NODE-8fa901": dict(site="Substation-Alpha-North", hostname="sentinel-substation-01",
                                kernel_version="6.8.0-45-generic", backend="INTEL_OPENVINO",
                                cpu_pct=14.2, ram_mb=240.0, npu_temp_c=48.5,
                                packets_inspected=150000, ebpf_drops=48,
                                mitigation_latency_us=0.84),
            "NODE-c34b12": dict(site="Metro-General-Hospital", hostname="sentinel-hospital-pacs",
                                kernel_version="6.8.0-45-generic", backend="TENSORRT",
                                cpu_pct=18.7, ram_mb=512.0, npu_temp_c=52.1,
                                packets_inspected=98000, ebpf_drops=35,
                                mitigation_latency_us=0.79),
        }
        for node_id, vals in telemetry.items():
            row = (await db.execute(
                select(Node).where(Node.node_id == node_id)
            )).scalar_one_or_none()
            if row is None:
                row = Node(node_id=node_id, site=vals["site"], status="ONLINE",
                           nexus_id="NEXUS-LOCAL", tenant_id=tid, last_heartbeat=now)
                db.add(row)
                print(f"SEED node {node_id}")
            for k, v in vals.items():
                setattr(row, k, v)
            row.tenant_id = tid
            row.status = "ONLINE"
            row.last_heartbeat = now

        # --- global threats (Service 7, global rows) ---
        for iid, ip, ttype, mitre, conf, sector, blocked in [
            ("IOC-GLOBAL-8901", "198.51.100.45", "THREAT_SCADA_ANOMALY", "T0855", 0.998, "ENERGY_UTILITY", 1420),
            ("IOC-GLOBAL-8902", "203.0.113.88", "THREAT_C2_BEACON", "T1071", 0.971, "HEALTHCARE", 860),
            ("IOC-GLOBAL-8903", "192.0.2.144", "THREAT_SCADA_ANOMALY", "T0831", 0.953, "MANUFACTURING", 412),
        ]:
            row = (await db.execute(
                select(GlobalThreat).where(GlobalThreat.indicator_id == iid)
            )).scalar_one_or_none()
            if row is None:
                db.add(GlobalThreat(
                    indicator_id=iid, ip=ip, subnet_mask=32, threat_type=ttype,
                    mitre_id=mitre, confidence=conf, first_seen=now - timedelta(hours=2),
                    expires_at=now + timedelta(hours=22), origin_sector=sector,
                    appliances_blocked=blocked, tenant_id=None))
                print(f"SEED global threat {iid} {ip}")

        # --- scada events (Service 8) ---
        existing = (await db.execute(
            select(ScadaEvent).where(ScadaEvent.tenant_id == tid)
        )).scalars().all()
        if not existing:
            for node, site, proto, plc, attacker, fc, reg, mitre, mins in [
                ("NODE-8fa901", "Substation-Alpha-North", "MODBUS_TCP", "192.168.1.10",
                 "198.51.100.45", "0x05 (Force Single Coil)", 105, "T0855", 12),
                ("NODE-8fa901", "Substation-Alpha-North", "IEC104", "192.168.1.20",
                 "198.51.100.45", "APDU Type 45 (Single Command)", None, "T0855", 40),
                ("NODE-c34b12", "Metro-General-Hospital", "S7COMM", "10.0.1.50",
                 "203.0.113.99", "0x04 (Read)", 200, "T0831", 65),
                ("NODE-8fa901", "Substation-Alpha-North", "DNP3", "192.168.1.30",
                 "192.0.2.144", "Cold Restart", None, "T0806", 90),
                ("NODE-c34b12", "Metro-General-Hospital", "MODBUS_TCP", "10.0.1.60",
                 "198.51.100.45", "0x0F (Force Multiple Coils)", 110, "T0855", 130),
            ]:
                db.add(ScadaEvent(
                    node_node_id=node, site=site, protocol=proto, plc_ip=plc,
                    attacker_ip=attacker, function_code=fc, register_address=reg,
                    mitre_id=mitre, action="XDP_DROP", mitigation_time_us=0.84,
                    ts=now - timedelta(minutes=mins), tenant_id=tid))
            print("SEED scada events (5)")

        # --- ransomware hashes (Service 9, global rows) ---
        for sha, proc, ent, iops, site in [
            ("4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
             "backup_encryptor.elf", 7.95, 1420, "Metro-General-Hospital"),
            ("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
             "doc_macro_dropper.exe", 7.61, 890, "Substation-Alpha-North"),
            ("5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
             "update_svc_hidden.bin", 7.72, 640, "Coastal-Refinery-ZoneB"),
        ]:
            row = (await db.execute(
                select(RansomwareHash).where(RansomwareHash.sha256 == sha)
            )).scalar_one_or_none()
            if row is None:
                db.add(RansomwareHash(
                    sha256=sha, process_name=proc, detected_entropy=ent,
                    nominal_baseline=3.84, burst_iops=iops, reported_by_site=site,
                    first_detected=now - timedelta(hours=3),
                    status="BLOCKED_FLEET_WIDE", tenant_id=None))
                print(f"SEED ransomware {proc}")

        await db.commit()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
