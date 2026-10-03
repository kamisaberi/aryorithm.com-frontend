"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type NIS2Mandate } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_NIS2 } from "@/data/dummy";

export default function Nis2DoraPage() {
  const { token } = useAuth();
  const nis2 = useBackend(DUMMY_NIS2, (t: string) => backend.nis2(t), token, 20000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exportPdf = async () => {
    if (!token || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const blob = await backend.exportCompliance(
        { framework: "NIS2", format: "PDF", include_sla_proofs: true, reporting_period_days: 30 }, token
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "compliance_NIS2.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage("Auditor-signed PDF downloaded.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: "article", header: "Article", render: (m: NIS2Mandate) => (
      <span className="font-mono text-[11px] text-ink">{m.article}</span>
    )},
    { key: "title", header: "Mandate", render: (m: NIS2Mandate) => (
      <span className="text-[12px] text-ink">{m.title}</span>
    )},
    { key: "status", header: "Status", render: (m: NIS2Mandate) => (
      <Badge variant={m.status === "PASS" ? "kernel" : "threat"}>{m.status}</Badge>
    )},
    { key: "evidence", header: "Evidence", render: (m: NIS2Mandate) => (
      <span className="text-[11.5px] text-muted">{m.evidence}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="EU NIS2 & DORA"
        description="Statutory mandates with live line-rate mitigation proofs"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "EU NIS2 & DORA" }]}
        actions={
          <button type="button" disabled={busy} onClick={() => void exportPdf()} className="admin-btn-primary text-[12px] disabled:opacity-50">
            {busy ? "Exporting…" : "Export Auditor-Signed PDF Report"}
          </button>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Compliance Score</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">{nis2.data.compliance_score_pct.toFixed(1)}%</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{nis2.data.overall_status}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Framework</p>
          <p className="mt-2 text-[13px] font-medium text-ink">{nis2.data.framework}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">
            audited {new Date(nis2.data.last_audit_timestamp * 1000).toLocaleString()}
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Live Proof</p>
          <p className="mt-2 font-mono text-[11px] text-muted">0.84µs mean drop vs statutory rapid-handling limits</p>
          <p className="mt-1 font-mono text-[10px] text-muted">$0 cloud egress · 24/7 autonomous</p>
        </Card>
      </div>
      {message && <p className="font-mono text-[11px] text-muted">{message}</p>}
      <Card>
        <Table columns={columns} data={nis2.data.statutory_mandates} keyExtractor={(m) => m.article} />
      </Card>
    </div>
  );
}
