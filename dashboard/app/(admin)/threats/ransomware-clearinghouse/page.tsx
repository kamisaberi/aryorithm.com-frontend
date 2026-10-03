"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type RansomwareHash } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: RansomwareHash[] = [
  { sha256: "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a", process_name: "backup_encryptor.elf", detected_entropy: 7.95, nominal_baseline: 3.84, burst_iops: 1420, reported_by_site: "Metro-General-Hospital", first_detected: 1774997900, status: "BLOCKED_FLEET_WIDE" },
];

function barWidth(entropy: number): number {
  return Math.max(4, Math.min(100, (entropy / 8) * 100));
}

export default function RansomwarePage() {
  const { token } = useAuth();
  const hashes = useBackend<RansomwareHash[]>(FALLBACK, (t) => backend.ransomwareHashes(t), token, 20000);
  const worst = hashes.data.reduce((m, h) => Math.max(m, h.detected_entropy), 0);

  const exportCsv = () => {
    const rows = [["sha256", "process_name", "detected_entropy", "status"],
      ...hashes.data.map((h) => [h.sha256, h.process_name, String(h.detected_entropy), h.status])];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ransomware-blocklist.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const columns = [
    { key: "hash", header: "SHA-256", render: (h: RansomwareHash) => (
      <span className="font-mono text-[10.5px] text-ink" title={h.sha256}>{h.sha256.slice(0, 20)}…</span>
    )},
    { key: "proc", header: "Process", render: (h: RansomwareHash) => (
      <span className="font-mono text-[11px] text-ink">{h.process_name}</span>
    )},
    { key: "entropy", header: "Entropy", render: (h: RansomwareHash) => (
      <span className="font-mono text-[11px] text-threat">{h.detected_entropy.toFixed(2)}</span>
    )},
    { key: "iops", header: "Burst IOPS", render: (h: RansomwareHash) => (
      <span className="tabular font-mono text-[11px] text-ink">{h.burst_iops}</span>
    )},
    { key: "site", header: "Reported By", render: (h: RansomwareHash) => (
      <span className="text-[11.5px] text-muted">{h.reported_by_site}</span>
    )},
    { key: "status", header: "Status", render: (h: RansomwareHash) => (
      <Badge variant="kernel">{h.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ransomware Vault"
        description="High-entropy process hash registry with fleet-wide blocks"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/ransomware-clearinghouse" }, { label: "Ransomware Vault" }]}
        actions={
          <button type="button" onClick={exportCsv} className="admin-btn-secondary text-[12px]">
            Download Hash Blocklist (CSV)
          </button>
        }
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Entropy distribution (bits/byte)</p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-40 font-mono text-[10.5px] text-muted">nominal 3.84 ± 0.42</span>
            <div className="h-2 flex-1 rounded bg-hairline">
              <div className="h-full rounded bg-kernel" style={{ width: `${barWidth(3.84)}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-40 font-mono text-[10.5px] text-muted">detected bursts ≥ 7.50</span>
            <div className="h-2 flex-1 rounded bg-hairline">
              <div className="h-full rounded bg-threat" style={{ width: `${barWidth(worst || 7.95)}%` }} />
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <Table columns={columns} data={hashes.data} keyExtractor={(h) => h.sha256} />
      </Card>
    </div>
  );
}
