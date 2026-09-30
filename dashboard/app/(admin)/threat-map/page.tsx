"use client";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { DUMMY_METRICS, DUMMY_THREAT_MAP } from "@/data/dummy";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";
import { backend, type ThreatCoordinate } from "@/lib/backend";

export default function ThreatMapPage() {
  const { token } = useAuth();
  const { data: threatMap, live } = useBackend(DUMMY_THREAT_MAP, (t) => backend.threatMap(t), token);
  const { data: metrics } = useBackend(DUMMY_METRICS, (t) => backend.overviewMetrics(t), token);

  const coords = threatMap.coordinates;
  const active = coords.filter((c) => c.active_threat).length;

  const columns = [
    {
      key: "site",
      header: "Site",
      render: (c: ThreatCoordinate) => (
        <div>
          <p className="font-medium text-ink">{c.site}</p>
          <p className="font-mono text-[10px] text-muted">
            {c.lat.toFixed(2)}, {c.lng.toFixed(2)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: ThreatCoordinate) => (
        <Badge variant={c.active_threat ? "threat" : "kernel"}>
          {c.active_threat ? "ACTIVE" : "CLEAR"}
        </Badge>
      ),
    },
    {
      key: "lat",
      header: "Lat",
      render: (c: ThreatCoordinate) => (
        <span className="tabular font-mono text-[12px] text-ink">{c.lat.toFixed(2)}</span>
      ),
    },
    {
      key: "lng",
      header: "Lng",
      render: (c: ThreatCoordinate) => (
        <span className="tabular font-mono text-[12px] text-ink">{c.lng.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Map"
        description="Global threat visualization and real-time attack surface monitoring"
        breadcrumbs={[{ label: "Mission Control", href: "/dashboard" }, { label: "Threat Map" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {active} Active Threats{live ? "" : " (cached)"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nodes Online</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">{metrics.online_nodes}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Active Threats</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{active}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Mean SLA</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{metrics.mean_sla_us.toFixed(2)} µs</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={coords} keyExtractor={(c) => `${c.site}-${c.lat}-${c.lng}`} />
      </Card>
    </div>
  );
}
