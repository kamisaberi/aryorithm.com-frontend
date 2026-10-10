import type { SentinelPackage } from "@/lib/hub";

/** Filter vocabularies for the verified packages catalog.
 *  Tiers are the closed spec vocabulary; sectors are the distinct values
 *  present in the seed catalog (matched server-side as substrings). */
export const PACKAGE_TIER_OPTIONS: { value: string; label: string }[] = [
  { value: "native", label: "Tier A (Native C++20)" },
  { value: "wasm", label: "Tier B (Rust WebAssembly)" },
  { value: "lua", label: "Tier C (LuaJIT Dynamic)" },
];

export const PACKAGE_SECTOR_OPTIONS: string[] = [
  "Water, Oil & Gas, Manufacturing",
  "Automotive, Fabs, Siemens PLCs",
  "Enterprise DMZ, Cloud Edge",
  "Electrical Substations, Power Grids",
  "Web App Gateways, APIs",
  "Hospital PACS, Healthcare IoMT",
  "Municipal Water & Wastewater",
  "Defense, Battlefield Robotics, UAV",
];

export function prettyPackageTier(tier: string): string {
  return PACKAGE_TIER_OPTIONS.find((t) => t.value === tier)?.label ?? tier;
}

/** Offline fallback so pages render when the backend is unreachable.
 *  Mirrors the backend seed catalog (subset). */
export const FALLBACK_PACKAGES: SentinelPackage[] = [
  {
    id: "org.aryorithm.package.modbus_actuator_guard",
    slug: "modbus-actuator-guard",
    name: "Modbus SCADA Physical Actuator Guard",
    version: "1.0.0",
    tier: "native",
    tier_display: "Tier A (Native C++20)",
    language: "C++20",
    author: "Aryorithm Certified Security Team",
    verified: true,
    sector: "Water, Oil & Gas, Manufacturing",
    target_protocol: "MODBUS_TCP",
    default_port: 502,
    latency_sla_ns: 120,
    latency_display: "< 120 ns",
    mitigation_action: "KERNEL_DROP",
    compliance_tags: ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"],
    short_description:
      "Sub-microsecond in-kernel prevention of unauthorized coil overrides and valve jitter attacks.",
    technical_details:
      "Directly parses Modbus TCP MBAP headers and function codes at wire rate.",
    package_file_name: "modbus_actuator_guard.spkg",
    package_file_size_bytes: 23552,
    signature_algorithm: "Ed25519",
    install_command: "nexus-ctl hub broadcast modbus_actuator_guard.spkg",
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
  },
  {
    id: "org.aryorithm.package.s7comm_safety_interlock",
    slug: "s7comm-safety-interlock",
    name: "Siemens S7Comm PLC Safety Interlock",
    version: "1.0.0",
    tier: "wasm",
    tier_display: "Tier B (Rust WebAssembly)",
    language: "Rust",
    author: "Aryorithm Certified Security Team",
    verified: true,
    sector: "Automotive, Fabs, Siemens PLCs",
    target_protocol: "S7COMM",
    default_port: 102,
    latency_sla_ns: 1500,
    latency_display: "< 1.5 µs",
    mitigation_action: "KERNEL_DROP",
    compliance_tags: ["IEC-62443-4-2-FR5", "CMMC-SI.L2-3.14.1"],
    short_description:
      "WebAssembly linear-memory isolated interlock blocking unauthorized PLC CPU Stop and firmware alteration.",
    technical_details: "Dissects TPKT, COTP, and S7 protocol headers.",
    package_file_name: "s7comm_safety_interlock.spkg",
    package_file_size_bytes: 18432,
    signature_algorithm: "Ed25519",
    install_command: "nexus-ctl hub broadcast s7comm_safety_interlock.spkg",
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
  },
  {
    id: "org.aryorithm.package.iec104_grid_shield",
    slug: "iec104-grid-shield",
    name: "IEC-104 High-Voltage Grid Telecontrol Shield",
    version: "1.0.0",
    tier: "native",
    tier_display: "Tier A (Native C++20)",
    language: "C++20",
    author: "Aryorithm Certified Security Team",
    verified: true,
    sector: "Electrical Substations, Power Grids",
    target_protocol: "IEC_60870_5_104",
    default_port: 2404,
    latency_sla_ns: 150,
    latency_display: "< 150 ns",
    mitigation_action: "KERNEL_DROP",
    compliance_tags: ["IEC-62443-4-2-FR3", "CMMC-SI.L2-3.14.1"],
    short_description:
      "Sub-150ns in-kernel mitigation of rogue substation circuit breaker open and disconnect commands.",
    technical_details: "Dissects IEC 60870-5-104 APCI and ASDU frames at line rate.",
    package_file_name: "iec104_grid_shield.spkg",
    package_file_size_bytes: 24576,
    signature_algorithm: "Ed25519",
    install_command: "nexus-ctl hub broadcast iec104_grid_shield.spkg",
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
  },
  {
    id: "org.aryorithm.package.dicom_phi_sanitizer",
    slug: "dicom-phi-sanitizer",
    name: "Medical DICOM PACS PHI Privacy Sanitizer",
    version: "1.0.0",
    tier: "wasm",
    tier_display: "Tier B (Rust WebAssembly)",
    language: "Rust",
    author: "Aryorithm Certified Security Team",
    verified: true,
    sector: "Hospital PACS, Healthcare IoMT",
    target_protocol: "DICOM",
    default_port: 104,
    latency_sla_ns: 2000,
    latency_display: "< 2.0 µs",
    mitigation_action: "KERNEL_DROP",
    compliance_tags: ["HIPAA-Privacy-Rule", "EU-NIS2-Art21"],
    short_description:
      "WebAssembly linear-memory isolated DLP blocking unencrypted Patient Health Information leaks in medical imaging.",
    technical_details: "Validates the 128-byte preamble and 'DICM' magic bytes.",
    package_file_name: "dicom_phi_sanitizer.spkg",
    package_file_size_bytes: 19456,
    signature_algorithm: "Ed25519",
    install_command: "nexus-ctl hub broadcast dicom_phi_sanitizer.spkg",
    created_at: "2026-10-10T12:00:00Z",
    updated_at: "2026-10-10T12:00:00Z",
  },
];
