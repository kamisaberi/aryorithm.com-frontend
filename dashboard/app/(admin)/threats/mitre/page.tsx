"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type MitreHit, type RansomwareHash } from "@/lib/backend";
import { DUMMY_MITRE } from "@/data/dummy";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK_HASHES: RansomwareHash[] = [
  { sha256: "9f2c" + "a1b4c5d6e7f809102132435465768798a9b0c1d2e3f405162738495a6b7c8d9e", process_name: "svc_host.exe", detected_entropy: 7.92, nominal_baseline: 4.1, burst_iops: 48200, reported_by_site: "FRA-01", first_detected: 1774997000, status: "ACTIVE" },
  { sha256: "3d7e" + "b2c3d4e5f607182930415263748596a7b8c9d0e1f2a3b4c5d6e7f8091a2b3c4d5", process_name: "update.exe", detected_entropy: 7.61, nominal_baseline: 4.3, burst_iops: 31500, reported_by_site: "IAD-02", first_detected: 1774994400, status: "ACTIVE" },
];

export default function ThreatMitrePage() {
  const { token } = useAuth();
  const hits = useBackend<MitreHit[]>(DUMMY_MITRE, (t) => backend.mitre(t), token);
  const vault = useBackend<RansomwareHash[]>(FALLBACK_HASHES, (t) => backend.ransomwareHashes(t), token);

  const sorted = [...hits.data].sort((a, b) => b.count - a.count);
  const totalHits = hits.data.reduce((sum, h) => sum + h.count, 0);

  const hitColumns = [
    { key: "technique_id", header: "Technique", render: (h: MitreHit) => (
      <span className="font-mono text-[11px] text-cyan">{h.technique_id}</span>
    )},
    { key: "name", header: "Name", render: (h: MitreHit) => (
      <span className="text-[13px] text-ink">{h.name}</span>
    )},
    { key: "count", header: "Observed", render: (h: MitreHit) => (
      <span className="tabular font-mono text-[12px] text-ink">{h.count}</span>
    )},
  ];

  const vaultColumns = [
    { key: "sha256", header: "SHA-256", render: (h: RansomwareHash) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{h.sha256.slice(0, 20)}…</p>
        <p className="font-mono text-[10px] text-muted">{h.process_name}</p>
      </div>
    )},
    { key: "entropy", header: "Entropy", render: (h: RansomwareHash) => (
      <div>
        <p className="tabular font-mono text-[12px] text-ink">{h.detected_entropy.toFixed(2)}</p>
        <p className="font-mono text-[10px] text-muted">baseline {h.nominal_baseline}</p>
      </div>
    )},
    { key: "iops", header: "Burst IOPS", render: (h: RansomwareHash) => (
      <span className="tabular font-mono text-[12px] text-ink">{h.burst_iops.toLocaleString()}</span>
    )},
    { key: "site", header: "Site", render: (h: RansomwareHash) => (
      <span className="font-mono text-[11px] text-muted">{h.reported_by_site}</span>
    )},
    { key: "status", header: "Status", render: (h: RansomwareHash) => (
      <Badge variant={h.status === "ACTIVE" ? "threat" : "muted"}>{h.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MITRE ATT&CK & Ransomware"
        description="Technique hit mapping and the cross-tenant ransomware hash clearinghouse"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/mitre" }, { label: "MITRE ATT&CK & Ransomware" }]}
        actions={<Badge variant={hits.live ? "kernel" : "muted"}>{hits.live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Technique Hits</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{totalHits}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Techniques Mapped</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{hits.data.length}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Vault Hashes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{vault.data.length}</p>
        </Card>
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">ATT&CK Technique Coverage</p>
        </div>
        <Table columns={hitColumns} data={sorted} keyExtractor={(h) => h.technique_id} />
      </Card>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Ransomware Clearinghouse</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            cross-tenant IOC exchange — global rows plus own-tenant detections
          </p>
        </div>
        <Table columns={vaultColumns} data={vault.data} keyExtractor={(h) => h.sha256} />
      </Card>
    </div>
  );
}
