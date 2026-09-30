"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend } from "@/lib/backend";
import type { MitreHit } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_MITRE } from "@/data/dummy";
import { useAuth } from "@/lib/auth";

export default function MitrePage() {
  const { token } = useAuth();
  const { data, live } = useBackend(DUMMY_MITRE, (t) => backend.mitre(t), token);

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const total = data.reduce((sum, h) => sum + h.count, 0);

  const columns = [
    {
      key: "technique_id",
      header: "Technique ID",
      render: (h: MitreHit) => (
        <span className="font-mono text-[11px] text-ink">{h.technique_id}</span>
      ),
    },
    {
      key: "name",
      header: "Name",
      render: (h: MitreHit) => (
        <span className="text-[13px] text-ink">{h.name}</span>
      ),
    },
    {
      key: "count",
      header: "Count",
      render: (h: MitreHit) => (
        <span className="tabular font-mono text-[12px] text-ink">{h.count}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="MITRE ATT&CK"
        description="MITRE ATT&CK framework mapping and coverage analysis"
        breadcrumbs={[{ label: "Collective Grid", href: "/threat-bus" }, { label: "MITRE ATT&CK" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "live" : "cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Total Hits</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{total}</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={sorted} keyExtractor={(h) => h.technique_id} />
      </Card>
    </div>
  );
}
