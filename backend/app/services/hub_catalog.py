"""Seed catalog for the Aryorithm Hub (inserted when the table is empty).

Mirrors the API-spec samples so catalog / facets / featured work out of the
box; every seed manifest passes the registry linter (dogfooded below).
"""

SEED_PLUGINS: list[dict] = [
    {
        "slug": "siemens-s7comm-pro",
        "title": "Siemens S7Comm Pro Dissector",
        "short_description": "High-speed in-kernel dissector for S7-300, S7-1200, and S7-1500 industrial PLCs.",
        "category": "industrial-ot",
        "runtime": "NATIVE_CPP20",
        "supported_silicon": ["UNIVERSAL"],
        "verification_tier": "OFFICIAL_CORE",
        "author": {"name": "Aryorithm Technologies B.V.", "verified": True, "github_handle": "aryorithm",
                   "website": "https://aryorithm.com"},
        "install_count": 1420,
        "stars_count": 182,
        "fast_path_latency_us": 0.42,
        "ports": [102],
        "tags": ["siemens", "s7", "scada", "plc", "zero-copy"],
        "mitre_ids": ["T0801", "T0802"],
        "repository_url": "https://github.com/kamisaberi/blackbox-sentinel",
        "is_featured": True,
        "min_sentinel_version": ">= 2.0.0",
        "security_envelope": {
            "requires_ebpf": True,
            "required_capabilities": ["CAP_NET_ADMIN"],
            "requires_tpm_attestation": True,
            "network_egress_allowed": False,
            "max_memory_mb": 32,
        },
        "versions": [
            {"version": "2.4.0", "changelog": "Added S7-1500 optimized PDU block parser.",
             "readme": "# Siemens S7Comm Pro Dissector\n\nParses TPKT and COTP frames in-kernel at wire speed.\n"},
            {"version": "2.3.1", "changelog": "Fixed double-free on truncated COTP header.",
             "readme": "# Siemens S7Comm Pro Dissector\n\nParses TPKT and COTP frames in-kernel.\n"},
        ],
    },
    {
        "slug": "modbus-physical-guard",
        "title": "Modbus Physical Guard",
        "short_description": "Function-code firewall with physical safety interlocks for Modbus TCP cells.",
        "category": "industrial-ot",
        "runtime": "NATIVE_CPP20",
        "supported_silicon": ["UNIVERSAL"],
        "verification_tier": "ENTERPRISE_AUDITED",
        "author": {"name": "Aryorithm Technologies B.V.", "verified": True},
        "install_count": 864,
        "stars_count": 97,
        "fast_path_latency_us": 0.38,
        "ports": [502],
        "tags": ["modbus", "scada", "firewall", "zero-copy"],
        "mitre_ids": ["T0801"],
        "repository_url": "https://github.com/kamisaberi/blackbox-sentinel",
        "is_featured": False,
        "security_envelope": {
            "requires_ebpf": True,
            "required_capabilities": ["CAP_NET_ADMIN"],
            "requires_tpm_attestation": False,
            "network_egress_allowed": False,
            "max_memory_mb": 16,
        },
        "versions": [
            {"version": "1.2.0", "changelog": "Added coil-write safety interlock profiles.",
             "readme": "# Modbus Physical Guard\n\nFunction-code firewall for Modbus TCP.\n"},
        ],
    },
    {
        "slug": "iec61850-goose-relay",
        "title": "IEC 61850 GOOSE Relay Guard",
        "short_description": "Substation GOOSE trip-signal validator with malformed-frame drop.",
        "category": "energy-utilities",
        "runtime": "NATIVE_CPP20",
        "supported_silicon": ["ROCKCHIP_RKNN", "UNIVERSAL"],
        "verification_tier": "OFFICIAL_CORE",
        "author": {"name": "Aryorithm Technologies B.V.", "verified": True},
        "install_count": 511,
        "stars_count": 64,
        "fast_path_latency_us": 0.51,
        "ports": [],
        "tags": ["iec61850", "goose", "substation", "energy"],
        "mitre_ids": ["T0804"],
        "repository_url": "https://github.com/kamisaberi/blackbox-sentinel",
        "is_featured": True,
        "security_envelope": {
            "requires_ebpf": True,
            "required_capabilities": ["CAP_NET_ADMIN", "CAP_SYS_NICE"],
            "requires_tpm_attestation": True,
            "network_egress_allowed": False,
            "max_memory_mb": 24,
        },
        "versions": [
            {"version": "1.0.0", "changelog": "Initial relay guard release.",
             "readme": "# IEC 61850 GOOSE Relay Guard\n\nValidates substation trip signals.\n"},
        ],
    },
    {
        "slug": "dicom-pacs-shield",
        "title": "DICOM PACS Shield",
        "short_description": "Medical imaging ingress filter with PHI-aware audit logging.",
        "category": "healthcare-iot",
        "runtime": "NATIVE_CPP20",
        "supported_silicon": ["INTEL_OPENVINO"],
        "verification_tier": "ENTERPRISE_AUDITED",
        "author": {"name": "MedEdge Labs", "verified": True, "github_handle": "mededge"},
        "install_count": 233,
        "stars_count": 41,
        "fast_path_latency_us": 1.15,
        "ports": [104, 11112],
        "tags": ["dicom", "pacs", "healthcare", "phi"],
        "mitre_ids": [],
        "repository_url": "",
        "is_featured": True,
        "security_envelope": {
            "requires_ebpf": False,
            "required_capabilities": [],
            "requires_tpm_attestation": False,
            "network_egress_allowed": False,
            "max_memory_mb": 64,
        },
        "versions": [
            {"version": "0.9.2", "changelog": "Tightened association negotiation checks.",
             "readme": "# DICOM PACS Shield\n\nIngress filter for medical imaging.\n"},
        ],
    },
    {
        "slug": "netflow-autoencoder",
        "title": "NetFlow Autoencoder Anomaly Model",
        "short_description": "ONNX anomaly scorer for NetFlow/IPFIX telemetry streams.",
        "category": "ai-models",
        "runtime": "ONNX_NEURAL_WEIGHTS",
        "supported_silicon": ["NVIDIA_TENSORRT", "INTEL_OPENVINO"],
        "verification_tier": "COMMUNITY_VERIFIED",
        "author": {"name": "Flow Research Collective", "verified": False},
        "install_count": 389,
        "stars_count": 112,
        "fast_path_latency_us": None,
        "ports": [],
        "tags": ["netflow", "anomaly", "onnx", "ml"],
        "mitre_ids": ["T1040"],
        "repository_url": "",
        "is_featured": True,
        "security_envelope": {
            "requires_ebpf": False,
            "required_capabilities": [],
            "requires_tpm_attestation": False,
            "network_egress_allowed": False,
            "max_memory_mb": 512,
        },
        "versions": [
            {"version": "2.4.0", "changelog": "Retrained on 90-day backbone sample.",
             "readme": "# NetFlow Autoencoder\n\nAnomaly scorer for flow telemetry.\n"},
            {"version": "2.3.0", "changelog": "Halved false positives on DNS tunnels.",
             "readme": "# NetFlow Autoencoder\n\nAnomaly scorer for flow telemetry.\n"},
        ],
    },
    {
        "slug": "graded-canary-wasm",
        "title": "Graded Canary Micro-Rule",
        "short_description": "Sandboxed WASM canary checks for staged fleet rollouts.",
        "category": "wasm-micro-rules",
        "runtime": "WASM_SANDBOX",
        "supported_silicon": ["UNIVERSAL"],
        "verification_tier": "COMMUNITY_VERIFIED",
        "author": {"name": "Canary Works", "verified": False},
        "install_count": 158,
        "stars_count": 23,
        "fast_path_latency_us": 3.8,
        "ports": [],
        "tags": ["wasm", "canary", "rollout"],
        "mitre_ids": [],
        "repository_url": "",
        "is_featured": False,
        "security_envelope": {
            "requires_ebpf": False,
            "required_capabilities": [],
            "requires_tpm_attestation": False,
            "network_egress_allowed": False,
            "max_memory_mb": 8,
        },
        "versions": [
            {"version": "1.0.0", "changelog": "Initial canary rule pack.",
             "readme": "# Graded Canary Micro-Rule\n\nSandboxed rollout checks.\n"},
        ],
    },
]


def seed_manifest_yaml(slug: str, version: str, runtime: str) -> str:
    """Minimal linter-passing manifest for a seed version."""
    abi = '\n  abi_version: "1.0"' if runtime == "NATIVE_CPP20" else ""
    return (
        'schema_version: "1.0.0"\n'
        "metadata:\n"
        f'  id: "aryorithm/{slug}"\n'
        f'  version: "{version}"\n'
        f'  title: "{slug}"\n'
        "runtime:\n"
        f"  type: {runtime}{abi}\n"
        "network:\n"
        "  default_ports: []\n"
        "security:\n"
        "  max_memory_mb: 32\n"
    )
