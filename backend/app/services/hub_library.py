"""Hub library catalogs: Malware PCAP Vault, SLAB Datasets, Twin Scenarios.

Seed data transcribed from the hub-expansion brief (5 PCAPs, 3 datasets,
3 scenarios). Portable adaptation notes vs the Postgres original:
enums stay natural SQLAlchemy enums, ``TEXT[]`` becomes JSON, ``NUMERIC``
becomes Float, ``JSONB`` becomes JSON.

Artifact files are deterministic stand-ins (header + patterned filler,
a few KB) until real captures are published — ``file_size_bytes`` and
``sha256_checksum`` always describe the REAL bytes on disk (the brief's
sizes/hashes are placeholders), so downloads stay verifiable end to end.
``download_url`` is built per-request (host-independent), never stored.
Same lazy-seed pattern as the plugin registry and sentinel packages:
``ensure_seed()`` inserts missing ids and never touches existing rows.
"""

import hashlib
from pathlib import Path

from app.config import settings

# Vault subdirectories under HUB_PACKAGE_DIR (default storage/packages).
KINDS = ("pcaps", "datasets", "scenarios")

PCAP_CATEGORIES = ("SCADA_ICS", "MALWARE_C2", "EXPLOIT_DOS", "HEALTHCARE_IOMT", "AEROSPACE_UAV")
DATASET_FORMATS = ("SLAB_BINARY", "PCAP_RAW", "PARQUET_COMPACT", "NETFLOW_IPFIX")
SCENARIO_COMPLEXITIES = ("STARTER", "INTERMEDIATE", "ADVANCED_RED_TEAM")

PCAPS_SEED: list[dict] = [
    {
        "id": "pcap-industroyer2-iec104",
        "slug": "industroyer2-iec104",
        "title": "Industroyer2 High-Voltage IEC-104 Breaker Trip Capture",
        "category": "SCADA_ICS",
        "target_protocol": "IEC_60870_5_104",
        "attack_type": "Unauthorized Telecontrol Command Injection (ASDU Type 45)",
        "source_origin": "CISA / ESET Ukraine Power Grid Investigation",
        "packet_count": 84210,
        "duration_seconds": 184.50,
        "file_name": "industroyer2_substation.pcap",
        "mitre_attack_ids": ["T0813", "T0855", "T0885"],
        "recommended_spkg_id": "org.aryorithm.package.iec104_grid_shield",
        "short_description": "Byte-for-byte transmission capture of the Industroyer2 high-voltage circuit breaker disconnect attack.",
        "technical_analysis": "Contains raw IEC 60870-5-104 APDU frames. The attacker sends ASDU Type 45 (C_SC_NA_1 Single Command) targeting Information Object Address (IOA) 101 with command state 0x01 (Execute / Trip Breaker). Used to test sub-microsecond in-kernel eBPF mitigation.",
    },
    {
        "id": "pcap-triton-tristation",
        "slug": "triton-tristation",
        "title": "TRITON / Trisis Safety Instrumented System (SIS) Firmware Override",
        "category": "SCADA_ICS",
        "target_protocol": "TRISTATION_1131",
        "attack_type": "SIS Program Memory Injection & Ladder Logic Modification",
        "source_origin": "Nozomi Networks & FireEye Petrochemical Audit",
        "packet_count": 31400,
        "duration_seconds": 92.10,
        "file_name": "triton_trisis_sis.pcap",
        "mitre_attack_ids": ["T0843", "T0857", "T0880"],
        "recommended_spkg_id": "org.aryorithm.package.triton_sis",
        "short_description": "Authentic capture of the TRITON malware injecting unauthorized firmware blocks into Triconex safety PLCs.",
        "technical_analysis": "Dissects proprietary TriStation 1131 UDP frames on port 19999. Demonstrates Command 0x02 (Upload/Write Program Memory) targeting the emergency core shutdown controller in an industrial refinery.",
    },
    {
        "id": "pcap-stuxnet-s7comm",
        "slug": "stuxnet-s7comm",
        "title": "Siemens S7Comm Unauthorized PLC Ladder Logic Injection",
        "category": "SCADA_ICS",
        "target_protocol": "S7COMM",
        "attack_type": "PLC CPU Stop & Block Download Tampering",
        "source_origin": "CISA / ICS-CERT Official Repository",
        "packet_count": 112000,
        "duration_seconds": 240.00,
        "file_name": "stuxnet_s7comm_injected.pcap",
        "mitre_attack_ids": ["T0843", "T0803", "T0836"],
        "recommended_spkg_id": "org.aryorithm.package.s7comm_safety_interlock",
        "short_description": "Clean Siemens S7Comm trace demonstrating rogue Function Code 0x29 (CPU STOP) and block overwrites.",
        "technical_analysis": "Dissects ISO-on-TCP (TPKT), COTP, and Siemens S7Comm frames on TCP Port 102. Highlights the sequence leading to S7-1200/1500 controller halt and unauthorized ladder logic injection.",
    },
    {
        "id": "pcap-modbus-coil-abuse",
        "slug": "modbus-coil-abuse",
        "title": "Modbus TCP Actuator Oscillation & Coil Override Flood",
        "category": "SCADA_ICS",
        "target_protocol": "MODBUS_TCP",
        "attack_type": "High-Frequency Coil Toggle (Actuator Wear Attack)",
        "source_origin": "University of Illinois Urbana-Champaign SCADA Lab",
        "packet_count": 52100,
        "duration_seconds": 60.00,
        "file_name": "modbus_uiuc_scada_attack.pcap",
        "mitre_attack_ids": ["T0855", "T0831", "T0836"],
        "recommended_spkg_id": "org.aryorithm.package.modbus_actuator_guard",
        "short_description": "SCADA network trace replaying rapid-fire Modbus FC05 coil overrides designed to induce water hammer shocks.",
        "technical_analysis": "Sends bursts of Modbus TCP Function Code 05 (Write Single Coil) and Function Code 15 (Write Multiple Coils) at > 150 Hz targeting critical cooling valves. Verified against Sentinel's 88 ns Native C++20 clamp.",
    },
    {
        "id": "pcap-http2-rapid-reset",
        "slug": "http2-rapid-reset",
        "title": "HTTP/2 Rapid Reset Stream Multiplexing DoS Flood (CVE-2023-44487)",
        "category": "EXPLOIT_DOS",
        "target_protocol": "HTTP2_TCP",
        "attack_type": "RST_STREAM Cancellation Abuse Burst",
        "source_origin": "Real Adversary Botnet Capture",
        "packet_count": 98400,
        "duration_seconds": 45.20,
        "file_name": "cve_2023_44487_rapid_reset.pcap",
        "mitre_attack_ids": ["T1498", "T1499"],
        "recommended_spkg_id": "org.aryorithm.package.http_rapid_reset",
        "short_description": "Traffic capture exhibiting the HTTP/2 Rapid Reset exploit delivering tens of thousands of stream cancellations/sec.",
        "technical_analysis": "Exhibits clients opening HTTP/2 streams with HEADERS frames followed immediately by RST_STREAM frames with error code 0x08 (CANCEL), exhausting reverse-proxy worker threads.",
    },
]

DATASETS_SEED: list[dict] = [
    {
        "id": "slab-cicids2017-portscan",
        "slug": "cicids2017-portscan",
        "name": "CIC-IDS-2017 PortScan Benchmark (SLAB Protocol)",
        "format": "SLAB_BINARY",
        "tensor_dimension": 32,
        "total_records": 286467,
        "normal_records_count": 127537,
        "anomalous_records_count": 158930,
        "normalization_method": "MinMax [0.0 - 1.0] (Quantized FP16)",
        "source_benchmark": "Canadian Institute for Cybersecurity (CIC-IDS-2017)",
        "file_name": "cicids2017_portscan.slab",
        "doi_citation": "10.5281/zenodo.10892341",
        "paper_reference": "K. Saberifard, 'Deterministic Sub-Microsecond Active Cyber-Physical Defense via eBPF and Heterogeneous Edge Silicon', IEEE Trans., 2026.",
        "streaming_throughput_eps": "65,000+ EPS (Zero-Copy Socket Stream)",
        "short_description": "Pre-normalized binary dataset in SLAB wire format designed for zero-copy line-rate evaluation on sentinel-lab.",
    },
    {
        "id": "slab-unsw-nb15-cps",
        "slug": "unsw-nb15-cps",
        "name": "UNSW-NB15 Cyber-Physical Flows (SLAB Protocol)",
        "format": "SLAB_BINARY",
        "tensor_dimension": 42,
        "total_records": 420000,
        "normal_records_count": 250000,
        "anomalous_records_count": 170000,
        "normalization_method": "Z-score Standardized (Zero-Mean, Unit-Variance)",
        "source_benchmark": "University of New South Wales (UNSW-NB15)",
        "file_name": "unsw_nb15_cps.slab",
        "doi_citation": "10.5281/zenodo.10892341",
        "paper_reference": "K. Saberifard, 'Reproducible Benchmark Harness for Line-Rate AI-NIDS', Zenodo, 2026.",
        "streaming_throughput_eps": "58,000+ EPS (Wire Speed)",
        "short_description": "Normalized 42-dimensional flow vectors covering reconnaissance, exploits, backdoors, and generic DOS vectors.",
    },
    {
        "id": "slab-swat-water-testbed",
        "slug": "swat-water-testbed",
        "name": "Secure Water Treatment Physical Sensor Stream (iTrust SWaT)",
        "format": "SLAB_BINARY",
        "tensor_dimension": 51,
        "total_records": 449919,
        "normal_records_count": 395283,
        "anomalous_records_count": 54636,
        "normalization_method": "Physical Sensor Range Scaling (bar, L/min, pH)",
        "source_benchmark": "Singapore University of Technology and Design (iTrust SWaT)",
        "file_name": "swat_water_physical.slab",
        "doi_citation": "10.5281/zenodo.10892341",
        "paper_reference": "K. Saberifard, 'Physical Invariant Verification in Cyber-Physical Water Infrastructure', 2026.",
        "streaming_throughput_eps": "72,000+ EPS (Sensor Array)",
        "short_description": "Continuous 51-sensor cyber-physical stream capturing motorized valves, water pumps, and chemical dosing setpoints.",
    },
]

SCENARIOS_SEED: list[dict] = [
    {
        "id": "scenario-power-grid-blackout",
        "slug": "power-grid-blackout",
        "name": "Power Substation Blackout & Breaker Trip Scenario",
        "complexity": "ADVANCED_RED_TEAM",
        "target_sector": "Electrical Transmission & Substations",
        "network_subnet": "10.240.0.0/24",
        "node_topology": {
            "nexus_c2": {"ip": "10.240.0.10", "role": "Central Command Plane"},
            "substation_edge": {"ip": "10.240.0.101", "role": "Substation Alpha (OpenVINO NPU)"},
            "adversary_node": {"ip": "10.240.0.99", "role": "Red Team Adversary (mbpoll + nmap)"},
        },
        "replayed_attacks": ["Industroyer2 IEC-104 Single Command", "SYN Flood TCP/2404", "mbpoll Coil Override"],
        "expected_mitigation_sla": "0.84 µs In-Kernel Drop + 38.4 ms Fleet Fanout",
        "file_name": "scenario_power_grid_blackout.tar.gz",
        "cli_pull_command": "make scenario-pull NAME=power_grid_blackout",
        "short_description": "Complete digital twin reproducing an active power substation cyberattack with automated adversary automation.",
        "technical_walkthrough": "Deploys a containerized high-voltage substation running Blackbox Sentinel. Container .99 fires real Industroyer2 APCI frames. Demonstrates in-kernel XDP dropping in 0.84 µs and immediate sub-50ms collective immunity rule propagation to other nodes.",
    },
    {
        "id": "scenario-hospital-pacs-heist",
        "slug": "hospital-pacs-heist",
        "name": "Hospital PACS Medical Imaging Exfiltration & Ransomware Scenario",
        "complexity": "INTERMEDIATE",
        "target_sector": "Healthcare Facilities & IoMT",
        "network_subnet": "10.240.0.0/24",
        "node_topology": {
            "nexus_c2": {"ip": "10.240.0.10", "role": "Central Command Plane"},
            "hospital_edge": {"ip": "10.240.0.102", "role": "Hospital Radiology PACS (TensorRT GPU)"},
            "adversary_node": {"ip": "10.240.0.99", "role": "Exfiltration Agent"},
        },
        "replayed_attacks": ["DICOM PHI Exfiltration C-STORE", "High-Entropy Ransomware Stream (7.95 bits)"],
        "expected_mitigation_sla": "2.0 µs Wasm DLP Drop + 0.84 µs eBPF Drop",
        "file_name": "scenario_hospital_pacs_heist.tar.gz",
        "cli_pull_command": "make scenario-pull NAME=hospital_pacs_heist",
        "short_description": "Simulates patient record theft from clinical MRI/CT archives coupled with an active ransomware encryption burst.",
        "technical_walkthrough": "Validates Subsystem 17 (iot_sec) and the dicom_phi_sanitizer.spkg plugin intercepting cleartext patient tags, while Subsystem 07 (epp_ngav) detects outbound high-entropy file writes.",
    },
    {
        "id": "scenario-refinery-disaster-triton",
        "slug": "refinery-disaster-triton",
        "name": "Refinery Emergency Shutdown (SIS) Controller Sabotage Scenario",
        "complexity": "ADVANCED_RED_TEAM",
        "target_sector": "Oil Refineries, Chemical Fabs & Petrochemical",
        "network_subnet": "10.240.0.0/24",
        "node_topology": {
            "nexus_c2": {"ip": "10.240.0.10", "role": "Central Command Plane"},
            "refinery_edge": {"ip": "10.240.0.103", "role": "Refinery Delta SIS (Rockchip RKNN)"},
            "adversary_node": {"ip": "10.240.0.99", "role": "TRITON Injection Station"},
        },
        "replayed_attacks": ["TRITON / Trisis TriStation 1131 Ingestion", "Modbus Actuator Valve Jitter"],
        "expected_mitigation_sla": "0.91 µs In-Kernel Drop + Emergency GPIO Relay Cut-off",
        "file_name": "scenario_refinery_disaster_triton.tar.gz",
        "cli_pull_command": "make scenario-pull NAME=refinery_disaster_triton",
        "short_description": "Emulates an attack against Triconex safety instrumented systems with cross-modal thermal discrepancy fusion.",
        "technical_walkthrough": "Fires genuine TRITON byte streams over virtual interfaces. Demonstrates Subsystem 18 (cps_sec) detecting physical valve limits, commanding eBPF driver drops, and tripping hardware GPIO safety relays.",
    },
]


def vault_root(kind: str) -> Path:
    """Vault root for one library kind: ``<HUB_PACKAGE_DIR>/<kind>``."""
    return Path(settings.HUB_PACKAGE_DIR) / kind


def build_standin_bytes(record_id: str) -> bytes:
    """Deterministic placeholder artifact (header + sha256 stream, ~8 KiB).

    Replaced byte-for-byte when real captures are published (Step 2); the
    DB always stores the real size/sha of whatever is on disk.
    """
    header = f"HUBLIB1:{record_id}\n".encode("utf-8")
    out = bytearray(header)
    counter = 0
    while len(out) < 8192:
        out += hashlib.sha256(f"{record_id}:{counter}".encode()).digest()
        counter += 1
    return bytes(out)


def materialize(kind: str, record_id: str, file_name: str) -> tuple[Path, bytes]:
    """Write a record's stand-in bytes to the vault; return (path, bytes)."""
    dest = vault_root(kind) / file_name.split(".")[0] / file_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    blob = build_standin_bytes(record_id)
    dest.write_bytes(blob)
    return dest, blob


async def ensure_seed(db) -> None:
    """Insert the 5 + 3 + 3 seed records once (idempotent, skips existing).

    Materializes stand-in artifact files and backfills real size/sha256 plus
    vault-relative ``artifact_path``. Never touches existing rows.
    """
    from sqlalchemy import select

    from app.models.hub import HubDataset, HubPcap, HubScenario

    for model, kind, specs in (
        (HubPcap, "pcaps", PCAPS_SEED),
        (HubDataset, "datasets", DATASETS_SEED),
        (HubScenario, "scenarios", SCENARIOS_SEED),
    ):
        existing = {row[0] for row in (await db.execute(select(model.id))).all()}
        for spec in (s for s in specs if s["id"] not in existing):
            db.add(model(**spec))
        await db.flush()

        rows = (await db.execute(select(model))).scalars().all()
        for row in rows:
            if row.artifact_path and (vault_root(kind) / row.artifact_path).is_file():
                continue
            dest, blob = materialize(kind, row.id, row.file_name)
            row.artifact_path = str(dest.relative_to(vault_root(kind)))
            row.file_size_bytes = len(blob)
            row.sha256_checksum = hashlib.sha256(blob).hexdigest()
        await db.flush()


async def resolve_artifact(db, kind: str, row) -> tuple[Path, str]:
    """Return ``(path, sha256)`` for a download, disk-first.

    Regenerates the stand-in when missing (best-effort vault write) and
    refreshes the row. The file always exists afterwards.
    """
    if row.artifact_path:
        candidate = vault_root(kind) / row.artifact_path
        if candidate.is_file():
            return candidate, hashlib.sha256(candidate.read_bytes()).hexdigest()
    dest, blob = materialize(kind, row.id, row.file_name)
    try:
        row.artifact_path = str(dest.relative_to(vault_root(kind)))
        row.file_size_bytes = len(blob)
        row.sha256_checksum = hashlib.sha256(blob).hexdigest()
        await db.flush()
    except OSError:
        pass
    return dest, hashlib.sha256(blob).hexdigest()
