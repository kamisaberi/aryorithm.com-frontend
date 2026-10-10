"""Verified sentinel-package seed data + helpers (`sentinel_packages` table).

The 8 records below are the official starter catalog (see HUB_PACKAGES.md).
`ensure_seed()` inserts any missing slugs — it never deletes or overwrites,
so operator edits survive restarts. Same lazy-seed pattern as the plugin
registry and the plans matrix.
"""

import hashlib
from datetime import datetime, timezone

PACKAGES_SEED: list[dict] = [
    {
        "id": "org.aryorithm.package.modbus_actuator_guard",
        "slug": "modbus-actuator-guard",
        "name": "Modbus SCADA Physical Actuator Guard",
        "version": "1.0.0",
        "tier": "native",
        "tier_display": "Tier A (Native C++20)",
        "language": "C++20",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Water, Oil & Gas, Manufacturing",
        "target_protocol": "MODBUS_TCP",
        "default_port": 502,
        "latency_sla_ns": 120,
        "latency_display": "< 120 ns",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"],
        "short_description": "Sub-microsecond in-kernel prevention of unauthorized coil overrides and valve jitter attacks.",
        "technical_details": "Directly parses Modbus TCP MBAP headers and function codes at wire rate. Intercepts Function Code 05 (Write Single Coil) and Function Code 15 (Write Multiple Coils). Offloads unauthorized actuator manipulation directly to driver-level eBPF blocked_ip_map in under 120 nanoseconds, eliminating valve oscillation and water-hammer attacks.",
        "package_file_name": "modbus_actuator_guard.spkg",
        "package_file_size_bytes": 23552,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast modbus_actuator_guard.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.s7comm_safety_interlock",
        "slug": "s7comm-safety-interlock",
        "name": "Siemens S7Comm PLC Safety Interlock",
        "version": "1.0.0",
        "tier": "wasm",
        "tier_display": "Tier B (Rust WebAssembly)",
        "language": "Rust",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Automotive, Fabs, Siemens PLCs",
        "target_protocol": "S7COMM",
        "default_port": 102,
        "latency_sla_ns": 1500,
        "latency_display": "< 1.5 µs",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["IEC-62443-4-2-FR5", "CMMC-SI.L2-3.14.1"],
        "short_description": "WebAssembly linear-memory isolated interlock blocking unauthorized PLC CPU Stop and firmware alteration.",
        "technical_details": "Compiled from safe Rust using sentinel-sdk-rs targeting wasm32. Dissects TPKT (0x03), COTP (0x02), and S7 protocol headers (0x32). Traps S7 Message Type 0x01 (Job Request) sending Function Code 0x29 (CPU STOP Command) or unauthorized program block downloads, preventing factory line shutdown attacks without risking daemon stability.",
        "package_file_name": "s7comm_safety_interlock.spkg",
        "package_file_size_bytes": 18432,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast s7comm_safety_interlock.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.log4j_jndi_fastdrop",
        "slug": "log4j-jndi-fastdrop",
        "name": "Log4j JNDI Zero-Day Fast Drop",
        "version": "1.0.0",
        "tier": "lua",
        "tier_display": "Tier C (LuaJIT Dynamic)",
        "language": "Lua",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Enterprise DMZ, Cloud Edge",
        "target_protocol": "RAW_TCP",
        "default_port": 0,
        "latency_sla_ns": 450,
        "latency_display": "< 450 ns",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["CMMC-SI.L2-3.14.1", "EU-NIS2-Art21"],
        "short_description": "Zero-allocation sliding-window pattern match dropping JNDI LDAP and RMI payloads at wire rate.",
        "technical_details": "Executes on LuaJIT 2.1 via direct C-FFI pointers without allocating garbage-collected strings. Performs sliding window multi-byte matching for '${jndi:' prefixes targeting LDAP, RMI, and DNS protocols. Hot-reloadable in < 2ms without daemon restart; commands instantaneous eBPF kernel drops on hostile source IPs.",
        "package_file_name": "log4j_jndi_fastdrop.spkg",
        "package_file_size_bytes": 19456,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast log4j_jndi_fastdrop.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.iec104_grid_shield",
        "slug": "iec104-grid-shield",
        "name": "IEC-104 High-Voltage Grid Telecontrol Shield",
        "version": "1.0.0",
        "tier": "native",
        "tier_display": "Tier A (Native C++20)",
        "language": "C++20",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Electrical Substations, Power Grids",
        "target_protocol": "IEC_60870_5_104",
        "default_port": 2404,
        "latency_sla_ns": 150,
        "latency_display": "< 150 ns",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"],
        "short_description": "Sub-150ns in-kernel mitigation of rogue substation circuit breaker open and disconnect commands.",
        "technical_details": "Dissects IEC 60870-5-104 APCI and ASDU frames at line rate. Detects Industroyer / CrashOverride exploit vectors targeting high-voltage circuit breakers. Intercepts ASDU Type 45 (Single Command) and ASDU Type 46 (Double Command) commanding breaker trip state (0x01 Execute), discarding frames before physical breaker activation.",
        "package_file_name": "iec104_grid_shield.spkg",
        "package_file_size_bytes": 24576,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast iec104_grid_shield.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.http_rapid_reset",
        "slug": "http-rapid-reset-shield",
        "name": "HTTP/2 Rapid Reset Exploit Shield",
        "version": "1.0.0",
        "tier": "lua",
        "tier_display": "Tier C (LuaJIT Dynamic)",
        "language": "Lua",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Web App Gateways, APIs",
        "target_protocol": "HTTP2_TCP",
        "default_port": 443,
        "latency_sla_ns": 450,
        "latency_display": "< 450 ns",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["CMMC-SI.L2-3.14.1", "EU-NIS2-Art21"],
        "short_description": "Sub-450ns line-rate mitigation of HTTP/2 CVE-2023-44487 rapid stream cancellation DoS floods.",
        "technical_details": "Tracks HTTP/2 binary framing state on raw TCP streams. Identifies rapid sequences of Frame Type 0x03 (RST_STREAM) with error code 0x08 (CANCEL) within a 1-second rolling time window. Enforces a strict rate ceiling of 20 cancellations/second, dropping flood attempts before web servers exhaust worker threads.",
        "package_file_name": "http_rapid_reset_shield.spkg",
        "package_file_size_bytes": 19456,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast http_rapid_reset_shield.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.dicom_phi_sanitizer",
        "slug": "dicom-phi-sanitizer",
        "name": "Medical DICOM PACS PHI Privacy Sanitizer",
        "version": "1.0.0",
        "tier": "wasm",
        "tier_display": "Tier B (Rust WebAssembly)",
        "language": "Rust",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Hospital PACS, Healthcare IoMT",
        "target_protocol": "DICOM",
        "default_port": 104,
        "latency_sla_ns": 2000,
        "latency_display": "< 2.0 µs",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["HIPAA-Privacy-Rule", "EU-NIS2-Art21"],
        "short_description": "WebAssembly linear-memory isolated DLP blocking unencrypted Patient Health Information leaks in medical imaging.",
        "technical_details": "Enforces HIPAA and NIS2 data privacy on clinical imaging networks. Unpacks medical DICOM transfers after validating the 128-byte preamble and 'DICM' magic bytes. Scans element tags for unencrypted cleartext Patient Name (0010, 0010) or Patient ID (0010, 0020), blocking unauthorized external exfiltration.",
        "package_file_name": "dicom_phi_sanitizer.spkg",
        "package_file_size_bytes": 19456,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast dicom_phi_sanitizer.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.dnp3_water_telemetry",
        "slug": "dnp3-water-telemetry",
        "name": "DNP3 Municipal Water Chemical Safety Clamp",
        "version": "1.0.0",
        "tier": "native",
        "tier_display": "Tier A (Native C++20)",
        "language": "C++20",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Municipal Water & Wastewater",
        "target_protocol": "DNP3",
        "default_port": 20000,
        "latency_sla_ns": 180,
        "latency_display": "< 180 ns",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"],
        "short_description": "Sub-180ns verification of DNP3 direct operate analog setpoints preventing chemical over-dosing.",
        "technical_details": "Specifically targets the Oldsmar water treatment attack vector. Validates DNP3 data link frames (0x05 0x64) and inspects Application Layer Function Code 0x05 (Direct Operate) and 0x06 (Direct Operate No Ack). Clamps setpoints on chemical dosing controllers to prevent unauthorized lye (sodium hydroxide) surges.",
        "package_file_name": "dnp3_water_telemetry.spkg",
        "package_file_size_bytes": 24576,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast dnp3_water_telemetry.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
    {
        "id": "org.aryorithm.package.mavlink_uav_guardian",
        "slug": "mavlink-uav-guardian",
        "name": "MAVLink Autonomous Drone Flight Command Guardian",
        "version": "1.0.0",
        "tier": "wasm",
        "tier_display": "Tier B (Rust WebAssembly)",
        "language": "Rust",
        "author": "Aryorithm Certified Security Team",
        "verified": True,
        "sector": "Defense, Battlefield Robotics, UAV",
        "target_protocol": "MAVLINK",
        "default_port": 14550,
        "latency_sla_ns": 1800,
        "latency_display": "< 1.8 µs",
        "mitigation_action": "KERNEL_DROP",
        "compliance_tags": ["MIL-STD-882E", "CMMC-SI.L2-3.14.1"],
        "short_description": "WebAssembly linear-memory isolated flight controller guard blocking spoofed mid-air disarm and land overrides.",
        "technical_details": "Dissects MAVLink v1 (0xFE) and v2 (0xFD) UDP telemetry packets. Identifies Message ID 76 (COMMAND_LONG). Intercepts Command 400 (MAV_CMD_COMPONENT_ARM_DISARM with param1=0 [force disarm]) and Command 21 (MAV_CMD_NAV_LAND) originating from unauthenticated ground control sources, thwarting drone hijacking.",
        "package_file_name": "mavlink_uav_guardian.spkg",
        "package_file_size_bytes": 18432,
        "signature_algorithm": "Ed25519",
        "install_command": "nexus-ctl hub broadcast mavlink_uav_guardian.spkg",
        "created_at": "2026-10-10T12:00:00Z",
        "updated_at": "2026-10-10T12:00:00Z",
    },
]

PACKAGE_TIERS = ("native", "wasm", "lua")


def _parse_ts(value: str) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def ensure_seed(db) -> None:
    """Insert any missing seed packages (by slug); never touches other rows."""
    from sqlalchemy import select

    from app.models.hub import SentinelPackage

    existing = {
        row[0]
        for row in (await db.execute(select(SentinelPackage.slug))).all()
    }
    for spec in PACKAGES_SEED:
        if spec["slug"] in existing:
            continue
        db.add(SentinelPackage(
            id=spec["id"],
            slug=spec["slug"],
            name=spec["name"],
            version=spec["version"],
            tier=spec["tier"],
            tier_display=spec["tier_display"],
            language=spec["language"],
            author=spec["author"],
            verified=spec["verified"],
            sector=spec["sector"],
            target_protocol=spec["target_protocol"],
            default_port=spec["default_port"],
            latency_sla_ns=spec["latency_sla_ns"],
            latency_display=spec["latency_display"],
            mitigation_action=spec["mitigation_action"],
            compliance_tags=list(spec["compliance_tags"]),
            short_description=spec["short_description"],
            technical_details=spec["technical_details"],
            package_file_name=spec["package_file_name"],
            package_file_size_bytes=spec["package_file_size_bytes"],
            signature_algorithm=spec["signature_algorithm"],
            install_command=spec["install_command"],
            created_at=_parse_ts(spec["created_at"]),
            updated_at=_parse_ts(spec["updated_at"]),
        ))
    await db.flush()


def build_spkg_bytes(record) -> bytes:
    """Deterministic stand-in `.spkg` payload for seed packages.

    Real binaries are published out-of-band; until then the download
    endpoint serves these reproducible bytes (header + zero padding to the
    recorded ``package_file_size_bytes``) so Content-Length, filename and
    checksum stay self-consistent. Same stand-in philosophy as the plugin
    registry's ``seed_artifact()``.
    """
    header = f"SPKG1:{record.id}:{record.version}\n".encode("utf-8")
    size = max(int(record.package_file_size_bytes or 0), len(header))
    return header + b"\x00" * (size - len(header))


def spkg_sha256(record) -> str:
    return hashlib.sha256(build_spkg_bytes(record)).hexdigest()
