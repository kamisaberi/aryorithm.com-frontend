"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import {
  API_BASE_URL,
  BACKEND_ORIGIN,
} from "@/lib/config";
import {
  backend,
  type SpkgPackage,
  type HubPcap,
  type HubDataset,
} from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

interface StoreData {
  packages: SpkgPackage[];
  pcaps: HubPcap[];
  datasets: HubDataset[];
}

const FALLBACK: StoreData = {
  packages: [
    {
      id: "spkg-001", slug: "modbus-guardian", name: "Modbus Guardian", version: "2.4.1",
      tier: "enterprise", tier_display: "Enterprise", language: "Rust", author: "Aryorithm Labs",
      verified: true, sector: "Energy Utility", target_protocol: "MODBUS_TCP", default_port: 502,
      latency_sla_ns: 840, latency_display: "840 ns", mitigation_action: "In-kernel packet drop",
      compliance_tags: ["NIS2", "IEC-62443"], short_description: "In-kernel Modbus/TCP anomaly guard with sub-microsecond verdicts.",
      technical_details: "eBPF XDP classifier with signed rule push.", package_file_name: "modbus_guardian.spkg",
      package_file_size_bytes: 1843200, signature_algorithm: "ed25519", install_command: "nexus-cli install modbus-guardian",
      created_at: "2025-11-04T10:00:00Z", updated_at: "2026-01-18T09:30:00Z",
    },
    {
      id: "spkg-002", slug: "dnp3-sentinel", name: "DNP3 Sentinel", version: "1.9.0",
      tier: "pro", tier_display: "Pro", language: "C", author: "Aryorithm Labs",
      verified: true, sector: "Water Treatment", target_protocol: "DNP3", default_port: 20000,
      latency_sla_ns: 1120, latency_display: "1.12 µs", mitigation_action: "Rate-limited write suppression",
      compliance_tags: ["IEC-62443"], short_description: "DNP3 outstation hardening with anomalous-write suppression.",
      technical_details: "Stateful DNP3 parser with allow-listed function codes.", package_file_name: "dnp3_sentinel.spkg",
      package_file_size_bytes: 1258291, signature_algorithm: "ed25519", install_command: "nexus-cli install dnp3-sentinel",
      created_at: "2025-12-02T14:00:00Z", updated_at: "2026-02-01T11:00:00Z",
    },
  ],
  pcaps: [
    {
      id: "pcap-001", slug: "s7comm-bruteforce", title: "S7comm Credential Brute-Force", category: "Reconnaissance",
      target_protocol: "S7COMM", attack_type: "BRUTE_FORCE", source_origin: "ARYORITHM-HONEYPOT",
      packet_count: 18422, duration_seconds: 312.4, file_name: "s7comm_bruteforce.pcapng",
      file_size_bytes: 9646899, sha256_checksum: "b1f0" + "c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1",
      download_url: "/api/v1/hub/pcaps/s7comm-bruteforce/download", mitre_attack_ids: ["T1110"],
      recommended_spkg_id: "spkg-002", short_description: "Ordered S7comm PDU flooding against a fake PCS7 station.",
      technical_analysis: "Session pacing shows 40ms login attempts with incrementing rack/slot pairs.",
      download_count: 412, created_at: "2026-01-09T08:00:00Z",
    },
    {
      id: "pcap-002", slug: "dnp3-anomaly-write", title: "DNP3 Anomalous Function Code Write", category: "Exploitation",
      target_protocol: "DNP3", attack_type: "MALICIOUS_WRITE", source_origin: "ARYORITHM-HONEYPOT",
      packet_count: 6104, duration_seconds: 95.7, file_name: "dnp3_anomaly_write.pcapng",
      file_size_bytes: 3250586, sha256_checksum: "e7a2" + "b3c4d5e6f70819203a4b5c6d7e8f9012a3b4c5d6e7f80912b3c4d5e6f70819a2",
      download_url: "/api/v1/hub/pcaps/dnp3-anomaly-write/download", mitre_attack_ids: ["T0855"],
      recommended_spkg_id: "spkg-002", short_description: "Illegal select-then-operate sequence on a virtual RTU.",
      technical_analysis: "Unsolicited responses with class-1/2/3 integrity violations.",
      download_count: 208, created_at: "2026-01-22T16:45:00Z",
    },
  ],
  datasets: [
    {
      id: "ds-001", slug: "slab-modbus-trace", name: "SLAB Modbus Trace", format: "Parquet",
      tensor_dimension: 128, total_records: 1200000, normal_records_count: 1187000,
      anomalous_records_count: 13000, normalization_method: "Robust Z-Score (MAD)",
      source_benchmark: "SLAB-2025", file_name: "slab_modbus_trace.parquet",
      file_size_bytes: 214748364, sha256_checksum: "aa10" + "b2c3d4e5f607182930415263748596a7b8c9d0e1f2a3b4c5d6e7f80910293847",
      download_url: "/api/v1/hub/datasets/slab-modbus-trace/download", doi_citation: "10.5281/zenodo.10000001",
      paper_reference: "SLAB: OT anomaly benchmark (2025)", streaming_throughput_eps: "48,000 evt/s",
      short_description: "Labeled Modbus/TCP frames for unsupervised anomaly training.",
      download_count: 96, created_at: "2026-02-11T12:00:00Z",
    },
    {
      id: "ds-002", slug: "pmu-windowed-fft", name: "PMU Windowed FFT Tensors", format: "NumPy NPZ",
      tensor_dimension: 64, total_records: 420000, normal_records_count: 411000,
      anomalous_records_count: 9000, normalization_method: "Min-Max [0,1]",
      source_benchmark: "IEEE PMU Detection Challenge", file_name: "pmu_fft_tensors.npz",
      file_size_bytes: 89128960, sha256_checksum: "cc20" + "d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f6071829304a5b6c7d8e9f0a1b2",
      download_url: "/api/v1/hub/datasets/pmu-windowed-fft/download", doi_citation: null,
      paper_reference: "Windowed-FFT PMU anomaly detection (2024)", streaming_throughput_eps: null,
      short_description: "64-bin FFT windows of synchrophasor data with oscillation labels.",
      download_count: 54, created_at: "2026-03-02T09:15:00Z",
    },
  ],
};

function bytes(n: number): string {
  if (n >= 1_073_741_824) return `${(n / 1_073_741_824).toFixed(1)} GB`;
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export default function HubStorePage() {
  const { token } = useAuth();
  const store = useBackend<StoreData>(
    FALLBACK,
    (t) =>
      Promise.all([backend.hubPackages(t), backend.hubPcaps(t), backend.hubDatasets(t)]).then(
        ([packages, pcaps, datasets]) => ({ packages, pcaps, datasets })
      ),
    token,
    60000
  );

  const { packages, pcaps, datasets } = store.data;

  const packageColumns = [
    { key: "package", header: "Package", render: (p: SpkgPackage) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{p.name}</p>
        <p className="font-mono text-[10px] text-muted">{p.slug} · v{p.version}</p>
      </div>
    )},
    { key: "tier", header: "Tier", render: (p: SpkgPackage) => (
      <Badge variant={p.verified ? "kernel" : "muted"}>{p.tier_display}</Badge>
    )},
    { key: "target", header: "Target", render: (p: SpkgPackage) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{p.target_protocol}:{p.default_port}</p>
        <p className="font-mono text-[10px] text-muted">{p.sector}</p>
      </div>
    )},
    { key: "sla", header: "Verdict SLA", render: (p: SpkgPackage) => (
      <span className="tabular font-mono text-[12px] text-ink">{p.latency_display}</span>
    )},
    { key: "size", header: "Size", render: (p: SpkgPackage) => (
      <span className="tabular font-mono text-[11.5px] text-muted">{bytes(p.package_file_size_bytes)}</span>
    )},
    { key: "download", header: "", render: (p: SpkgPackage) => (
      <a
        href={`${API_BASE_URL}/hub/packages/${p.slug}/download`}
        className="font-mono text-[10.5px] text-cyan hover:underline"
      >
        download
      </a>
    )},
  ];

  const pcapColumns = [
    { key: "title", header: "Capture", render: (p: HubPcap) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{p.title}</p>
        <p className="font-mono text-[10px] text-muted">{p.attack_type} · {p.category}</p>
      </div>
    )},
    { key: "protocol", header: "Protocol", render: (p: HubPcap) => (
      <span className="font-mono text-[11.5px] text-ink">{p.target_protocol}</span>
    )},
    { key: "packets", header: "Packets", render: (p: HubPcap) => (
      <div>
        <p className="tabular font-mono text-[12px] text-ink">{p.packet_count.toLocaleString()}</p>
        <p className="font-mono text-[10px] text-muted">{p.duration_seconds.toFixed(1)} s</p>
      </div>
    )},
    { key: "size", header: "Size", render: (p: HubPcap) => (
      <span className="tabular font-mono text-[11.5px] text-muted">{bytes(p.file_size_bytes)}</span>
    )},
    { key: "downloads", header: "Downloads", render: (p: HubPcap) => (
      <span className="tabular font-mono text-[12px] text-muted">{p.download_count}</span>
    )},
    { key: "download", header: "", render: (p: HubPcap) => (
      <a href={`${BACKEND_ORIGIN}${p.download_url}`} className="font-mono text-[10.5px] text-cyan hover:underline">
        download
      </a>
    )},
  ];

  const datasetColumns = [
    { key: "name", header: "Dataset", render: (d: HubDataset) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{d.name}</p>
        <p className="font-mono text-[10px] text-muted">{d.source_benchmark}</p>
      </div>
    )},
    { key: "format", header: "Format", render: (d: HubDataset) => (
      <div>
        <p className="font-mono text-[11.5px] text-ink">{d.format}</p>
        <p className="font-mono text-[10px] text-muted">dim {d.tensor_dimension}</p>
      </div>
    )},
    { key: "records", header: "Records", render: (d: HubDataset) => (
      <div>
        <p className="tabular font-mono text-[12px] text-ink">{d.total_records.toLocaleString()}</p>
        <p className="font-mono text-[10px] text-threat">{d.anomalous_records_count.toLocaleString()} anomalous</p>
      </div>
    )},
    { key: "size", header: "Size", render: (d: HubDataset) => (
      <span className="tabular font-mono text-[11.5px] text-muted">{bytes(d.file_size_bytes)}</span>
    )},
    { key: "download", header: "", render: (d: HubDataset) => (
      <a href={`${BACKEND_ORIGIN}${d.download_url}`} className="font-mono text-[10.5px] text-cyan hover:underline">
        download
      </a>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sentinel-Hub Package Store"
        description="Verified SPKG hardening packages, PCAP captures and SLAB research datasets"
        breadcrumbs={[{ label: "AI & Sentinel-Hub", href: "/hub/store" }, { label: "Package Store" }]}
        actions={<Badge variant={store.live ? "kernel" : "muted"}>{store.live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">SPKG Packages</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{packages.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{packages.filter((p) => p.verified).length} signed &amp; verified</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">PCAP Captures</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{pcaps.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{pcaps.reduce((s, p) => s + p.download_count, 0)} total downloads</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">SLAB Datasets</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{datasets.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{datasets.reduce((s, d) => s + d.total_records, 0).toLocaleString()} records</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Signature</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">ed25519</p>
          <p className="mt-1 font-mono text-[10px] text-muted">every artifact attested</p>
        </Card>
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Sentinel Packages (SPKG)</p>
        </div>
        <Table columns={packageColumns} data={packages} keyExtractor={(p) => p.id} />
      </Card>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">PCAP Vault</p>
        </div>
        <Table columns={pcapColumns} data={pcaps} keyExtractor={(p) => p.id} />
      </Card>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Research Datasets</p>
        </div>
        <Table columns={datasetColumns} data={datasets} keyExtractor={(d) => d.id} />
      </Card>
    </div>
  );
}
