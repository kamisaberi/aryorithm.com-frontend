export interface SentinelModule {
  id: string;
  name: string;
  cat: string;
  role: string;
  hook: string;
  mem: string;
}

export interface ModuleCategory {
  id: string;
  label: string;
  color: string;
}

export const MODULE_CATEGORIES: ModuleCategory[] = [
  { id: "net", label: "Network & Kernel", color: "#00E5FF" },
  { id: "endpoint", label: "Endpoint & Identity", color: "#00FFA3" },
  { id: "ot", label: "Physical & OT/SCADA", color: "#FFB800" },
  { id: "integrity", label: "Integrity & Deception", color: "#FF3366" },
];

export const MODULES: SentinelModule[] = [
  { id: "01_siem_core", name: "SIEM Core", cat: "net", role: "Local correlation engine and immutable evidence store. Indexes normalised events on-appliance so investigations never require a cloud tenancy.", hook: "Userspace ring consumer (AF_XDP batch)", mem: "184 MB" },
  { id: "02_ueba", name: "UEBA", cat: "endpoint", role: "User and entity behavioural analytics. Builds per-identity baselines and flags deviation in session, access and lateral-movement patterns.", hook: "Identity event bus subscriber", mem: "96 MB" },
  { id: "03_ndr", name: "NDR", cat: "net", role: "Network detection and response. Flow-level anomaly inference across east-west traffic using the xInfer tensor arena.", hook: "XDP ingress → feature extractor", mem: "142 MB" },
  { id: "04_ids_ips", name: "IDS / IPS", cat: "net", role: "Signature and heuristic intrusion detection with inline prevention authority at the driver ring.", hook: "XDP_DROP / XDP_PASS verdict path", mem: "128 MB" },
  { id: "05_waf", name: "WAF", cat: "net", role: "Web application firewall for HMI and operator portals — injection, traversal and deserialization defence.", hook: "TC egress/ingress classifier", mem: "74 MB" },
  { id: "06_edr", name: "EDR", cat: "endpoint", role: "Endpoint detection and response telemetry aggregation from host agents and kernel probes.", hook: "eBPF kprobe / tracepoint set", mem: "112 MB" },
  { id: "07_epp_ngav", name: "EPP / NGAV", cat: "endpoint", role: "Next-generation antivirus scoring of binaries and scripts with a local ML classifier — no cloud reputation lookup.", hook: "LSM bprm_check_security", mem: "158 MB" },
  { id: "08_nac", name: "NAC", cat: "endpoint", role: "Network access control. Admits or quarantines devices by TPM attestation, 802.1X posture and MAC provenance.", hook: "RADIUS / 802.1X policy hook", mem: "48 MB" },
  { id: "09_cwpp", name: "CWPP", cat: "endpoint", role: "Cloud workload protection for on-prem container and VM estates — runtime syscall policy per workload.", hook: "seccomp-bpf + cgroup v2", mem: "88 MB" },
  { id: "10_bad", name: "BAD", cat: "net", role: "Behavioural anomaly detection. Autoencoder novelty scoring that feeds the ForgeBridge uncertainty band.", hook: "Inference queue (zero-copy tensor)", mem: "204 MB" },
  { id: "11_rasp", name: "RASP", cat: "endpoint", role: "Runtime application self-protection instrumentation for control-room and SCADA client software.", hook: "uprobe on instrumented binaries", mem: "62 MB" },
  { id: "12_itdr", name: "ITDR", cat: "endpoint", role: "Identity threat detection and response. Kerberoasting, golden-ticket and LDAP abuse detection.", hook: "Kerberos / LDAPS dissector tap", mem: "84 MB" },
  { id: "13_ddos", name: "DDoS Mitigation", cat: "net", role: "Volumetric and protocol flood absorption at line rate, dropping before any sk_buff allocation.", hook: "XDP rate-limit hash map", mem: "56 MB" },
  { id: "14_ato", name: "ATO Defence", cat: "endpoint", role: "Account takeover detection — credential stuffing, impossible travel and session hijack heuristics.", hook: "Auth event correlation bus", mem: "52 MB" },
  { id: "15_ngfw", name: "NGFW", cat: "net", role: "Next-generation firewall policy with application awareness and zone segmentation for IT/OT boundaries.", hook: "XDP + TC dual-stage policy", mem: "134 MB" },
  { id: "16_cdr", name: "CDR", cat: "integrity", role: "Content disarm and reconstruction. Strips active content from files crossing the enclave boundary.", hook: "File transfer proxy (userspace)", mem: "118 MB" },
  { id: "17_iot_sec", name: "IoT Security", cat: "ot", role: "Constrained-device fingerprinting and firmware posture tracking across building and facility IoT.", hook: "Passive fingerprint dissector", mem: "78 MB" },
  { id: "18_cps_sec", name: "CPS Security", cat: "ot", role: "Cyber-physical constraint enforcement — rejects commands that would drive an actuator outside its safe envelope.", hook: "In-kernel physical constraint map", mem: "166 MB" },
  { id: "19_swg", name: "SWG", cat: "net", role: "Secure web gateway for egress-restricted enclaves with local category policy and TLS inspection.", hook: "TC egress classifier + proxy", mem: "102 MB" },
  { id: "20_fse", name: "FSE", cat: "integrity", role: "File system evidence engine. Tamper-evident forensic capture of artefacts touched during an incident.", hook: "fanotify + fsnotify probes", mem: "94 MB" },
  { id: "21_side_channel", name: "Side-Channel Monitor", cat: "integrity", role: "Detects cache-timing, power and EM side-channel exploitation attempts against the appliance itself.", hook: "PMU hardware counters (perf)", mem: "68 MB" },
  { id: "22_dfir", name: "DFIR", cat: "integrity", role: "Digital forensics and incident response workspace — timeline reconstruction from the local evidence store.", hook: "Evidence store query engine", mem: "146 MB" },
  { id: "23_ai_trism", name: "AI TRiSM", cat: "integrity", role: "Trust, risk and security management for the models themselves — drift, poisoning and adversarial input detection.", hook: "Model inference introspection tap", mem: "124 MB" },
  { id: "24_ztna", name: "ZTNA", cat: "endpoint", role: "Zero-trust network access brokering with per-session, attestation-bound authorisation.", hook: "Policy decision point (mTLS)", mem: "72 MB" },
  { id: "25_fdp", name: "FDP", cat: "integrity", role: "Fraud detection platform for transactional and metering data streams in utility environments.", hook: "Stream scoring pipeline", mem: "98 MB" },
  { id: "26_ddp", name: "DDP", cat: "integrity", role: "Distributed deception platform. Deploys protocol-accurate decoy PLCs and services to trap lateral movement.", hook: "Decoy listener + XDP redirect", mem: "86 MB" },
];

export interface PluginEntry {
  name: string;
  so: string;
  spec?: boolean;
}

export interface PluginGroup {
  id: string;
  label: string;
  color: string;
  note: string;
  plugins: PluginEntry[];
}

export const PLUGIN_GROUPS: PluginGroup[] = [
  {
    id: "industrial", label: "Industrial Protocols", color: "#FFB800",
    note: "Deterministic OT dissection with zero heap churn.",
    plugins: [
      { name: "Modbus TCP", so: "libary_modbus_tcp.so", spec: true },
      { name: "DNP3", so: "libary_dnp3.so", spec: true },
      { name: "PROFINET", so: "libary_profinet.so", spec: true },
      { name: "Siemens S7Comm", so: "libary_s7comm.so", spec: true },
      { name: "EtherNet/IP", so: "libary_enip_cip.so", spec: true },
      { name: "BACnet", so: "libary_bacnet.so", spec: true },
      { name: "IEC 61850 GOOSE", so: "libary_iec61850_goose.so" },
      { name: "IEC 61850 MMS", so: "libary_iec61850_mms.so" },
      { name: "IEC 60870-5-104", so: "libary_iec104.so" },
      { name: "OPC UA Binary", so: "libary_opcua.so" },
      { name: "CC-Link IE Field", so: "libary_cclink_ie.so" },
      { name: "HART-IP", so: "libary_hart_ip.so" },
    ],
  },
  {
    id: "aero", label: "Aerospace & Maritime", color: "#00E5FF",
    note: "Platform bus and transponder telemetry bridging.",
    plugins: [
      { name: "MAVLink UAV Telemetry", so: "libary_mavlink.so", spec: true },
      { name: "AIS Maritime Transponder", so: "libary_ais.so", spec: true },
      { name: "ARINC-429 Avionics", so: "libary_arinc429.so", spec: true },
      { name: "MIL-STD-1553B Bridge", so: "libary_mil1553.so" },
      { name: "NMEA 0183 / 2000", so: "libary_nmea.so" },
      { name: "ADS-B Surveillance", so: "libary_adsb.so" },
      { name: "CAN Bus / J1939", so: "libary_can_j1939.so" },
    ],
  },
  {
    id: "health", label: "Healthcare", color: "#00FFA3",
    note: "Clinical protocol validation with PHI kept on-premises.",
    plugins: [
      { name: "DICOM C-STORE Verification", so: "libary_dicom_cstore.so", spec: true },
      { name: "HL7 v2 Parser", so: "libary_hl7v2.so", spec: true },
      { name: "HL7 FHIR REST", so: "libary_fhir.so" },
      { name: "IHE PIX / PDQ", so: "libary_ihe_pix.so" },
      { name: "POCT1-A Device Link", so: "libary_poct1a.so" },
    ],
  },
  {
    id: "forwarders", label: "Enterprise SIEM Forwarders", color: "#FF3366",
    note: "Normalised export to the SOC you already run.",
    plugins: [
      { name: "CEF", so: "libary_cef.so", spec: true },
      { name: "LEEF", so: "libary_leef.so", spec: true },
      { name: "Syslog RFC-5424", so: "libary_syslog5424.so", spec: true },
      { name: "Kafka Zero-Copy Streaming", so: "libary_kafka_zc.so", spec: true },
      { name: "OpenTelemetry OTLP", so: "libary_otlp.so" },
      { name: "STIX 2.1 / TAXII", so: "libary_stix_taxii.so" },
    ],
  },
];

export const PLUGIN_TOTAL = PLUGIN_GROUPS.reduce((a, g) => a + g.plugins.length, 0);

export interface FormFactor {
  id: string;
  model: string;
  klass: string;
  color: string;
  featured?: boolean;
  tagline: string;
  headline: [string, string][];
  specs: [string, string][];
}

export const FORM_FACTORS: FormFactor[] = [
  {
    id: "s-1000", model: "Model S-1000", klass: "Industrial DIN-Rail", color: "#FFB800",
    tagline: "Fanless ruggedized chassis for substations, plant floors and rolling stock.",
    headline: [["Operating Range", "−40 °C to +85 °C"], ["Chassis", "Fanless DIN-rail"], ["Power", "Dual redundant"]],
    specs: [
      ["Compute", "Rockchip RK3588 NPU / Intel Atom x6000E"],
      ["Inference", "RKNN 6 TOPS / OpenVINO VPU offload"],
      ["Cooling", "Fanless conduction — zero moving parts"],
      ["Network", "4× 1GbE + 2× SFP fibre (bypass relay)"],
      ["Trust Anchor", "Physical TPM 2.0 (discrete, soldered)"],
      ["Power Input", "2× 24 V DC redundant, 18 W typical"],
      ["Compliance", "IEC 61850-3, IEEE 1613, EN 50121-4"],
      ["MTBF", "412,000 h @ 40 °C"],
    ],
  },
  {
    id: "s-5000", model: "Model S-5000", klass: "Enterprise 1U Rackmount", color: "#00E5FF", featured: true,
    tagline: "Full-rate datacentre and enclave inspection with GPU-accelerated inference.",
    headline: [["Form Factor", "1U rackmount"], ["Accelerator", "NVIDIA L4"], ["Uplinks", "2× 10/25GbE"]],
    specs: [
      ["Compute", "Dual Intel Xeon Silver / AMD EPYC 9124"],
      ["Inference", "NVIDIA L4 GPU accelerator (24 GB)"],
      ["Cooling", "N+1 hot-swap fan wall"],
      ["Network", "Dual 10/25GbE Intel SFP+ · native AF_XDP driver"],
      ["Trust Anchor", "Physical TPM 2.0 cryptoprocessor"],
      ["Power Input", "2× 800 W redundant PSU, 94% efficiency"],
      ["Compliance", "IEC 62443-4-2, FIPS 140-3 Level 2"],
      ["Throughput", "1,250,000 EPS sustained zero-copy"],
    ],
  },
  {
    id: "v-edge", model: "Model V-Edge", klass: "Virtual Appliance", color: "#00FFA3",
    tagline: "Byte-identical hardened image for hypervisor estates with no spare rack units.",
    headline: [["Image", "OVA / QCOW2"], ["Trust Anchor", "Adaptive vTPM"], ["Hypervisors", "3 supported"]],
    specs: [
      ["Compute", "Guest vCPU — 8 cores recommended"],
      ["Inference", "AVX-512 CPU backend / vGPU passthrough"],
      ["Hypervisors", "VMware vSphere, KVM, Proxmox VE"],
      ["Network", "SR-IOV VF or virtio with AF_XDP"],
      ["Trust Anchor", "Adaptive vTPM · DMI UUID fallback"],
      ["Image Integrity", "Signed OVA, SHA-256 manifest"],
      ["Compliance", "Inherits host attestation posture"],
      ["Footprint", "16 GB RAM, 120 GB evidence store"],
    ],
  },
];
