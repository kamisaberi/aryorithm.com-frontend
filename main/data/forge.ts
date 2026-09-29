export const FEATURE_NAMES = [
  "pkt_len_mean", "pkt_len_std", "iat_mean", "iat_std", "flow_dur", "fwd_pkts",
  "bwd_pkts", "fwd_bytes", "bwd_bytes", "syn_cnt", "ack_cnt", "rst_cnt",
  "psh_cnt", "urg_cnt", "ttl_mean", "win_size", "payload_ent", "proto_id",
  "src_port_c", "dst_port_c", "fn_code", "reg_addr", "reg_count", "unit_id",
  "poll_period", "resp_ratio", "err_rate", "burst_idx", "dir_ratio", "tcp_flags",
  "mb_excep", "seq_gap",
];

export interface GoldenAttack {
  id: string;
  name: string;
  family: string;
}

export const GOLDEN_ATTACKS: GoldenAttack[] = [
  { id: "GA-001", name: "Modbus force-single-coil injection", family: "OT command injection" },
  { id: "GA-002", name: "DNP3 unsolicited response spoof", family: "OT protocol abuse" },
  { id: "GA-003", name: "S7comm STOP CPU directive", family: "OT denial" },
  { id: "GA-004", name: "IEC 61850 GOOSE replay", family: "Substation replay" },
  { id: "GA-005", name: "EtherNet/IP CIP class-1 flood", family: "Volumetric OT" },
  { id: "GA-006", name: "BACnet write-property override", family: "Building control" },
  { id: "GA-007", name: "DICOM C-STORE malformed SOP", family: "Medical payload" },
  { id: "GA-008", name: "HL7 v2 segment smuggling", family: "Medical parser" },
  { id: "GA-009", name: "MAVLink waypoint hijack", family: "UAV telemetry" },
  { id: "GA-010", name: "MIL-1553 bus controller spoof", family: "Platform bus" },
  { id: "GA-011", name: "Kerberoast TGS-REQ harvest", family: "Identity" },
  { id: "GA-012", name: "LDAP shadow-credential write", family: "Identity" },
  { id: "GA-013", name: "SYN flood 14 Mpps", family: "Volumetric IT" },
  { id: "GA-014", name: "TLS renegotiation exhaustion", family: "Volumetric IT" },
  { id: "GA-015", name: "Firmware downgrade via TFTP", family: "Supply chain" },
  { id: "GA-016", name: "Rogue engineering workstation", family: "Lateral movement" },
  { id: "GA-017", name: "Cache-timing side channel probe", family: "Side channel" },
  { id: "GA-018", name: "Adversarial feature-space evasion", family: "AI TRiSM" },
];

export const YAML_SNIPPET = `# configs/safety/golden_attacks.yaml
# IMMUTABLE. Signed at release; the Forge cannot rewrite this file.
# A candidate that misses even one entry is purged, never promoted.

policy:
  required_detection_rate: 1.00   # 100% — non-negotiable
  on_regression: abort_and_purge
  compile_target: onnx_opset_17
  stage_to: sentinel_nexus

suite:
  - id: GA-001
    name: "Modbus force-single-coil injection"
    family: "OT command injection"
    pcap: "immutable/ga001_modbus_fc05.pcap"
    sha256: "e31b7c94a0fd2856bb417e0c9d3a5f28c7014be6d9825ff31a0c74e2b8d61947"
    must_detect: true

  - id: GA-004
    name: "IEC 61850 GOOSE replay"
    family: "Substation replay"
    pcap: "immutable/ga004_goose_replay.pcap"
    sha256: "7a2f04e18b9c3d65710fae29c4b08d37e51629af8c0d4b7e2910fa63c8d54b02"
    must_detect: true

  # ... 16 further entries, 18 total in the release suite`;
