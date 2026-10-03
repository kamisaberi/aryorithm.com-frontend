"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type Vessel } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: Vessel[] = [
  { vessel_mmsi: "244123456", vessel_name: "MV Atlantic Sentinel", vessel_type: "CONTAINER_CARRIER", current_lat: 51.95, current_lng: 4.12, satellite_link_status: "SATCOM_INMARSAT_NOMINAL", bandwidth_saved_mb: 4210.5, connected_sentinel_node: "NODE-MARITIME-04", active_threats_count: 0, spoofing_detected: false },
];

export default function MaritimePage() {
  const { token } = useAuth();
  const vessels = useBackend<Vessel[]>(FALLBACK, (t) => backend.vessels(t), token, 20000);
  const saved = vessels.data.reduce((s, v) => s + v.bandwidth_saved_mb, 0);

  const columns = [
    { key: "vessel", header: "Vessel", render: (v: Vessel) => (
      <div>
        <p className="font-medium text-[12.5px] text-ink">{v.vessel_name}</p>
        <p className="font-mono text-[10px] text-muted">MMSI {v.vessel_mmsi} · {v.vessel_type}</p>
      </div>
    )},
    { key: "pos", header: "Position", render: (v: Vessel) => (
      <span className="font-mono text-[11px] text-ink">{v.current_lat.toFixed(2)}, {v.current_lng.toFixed(2)}</span>
    )},
    { key: "link", header: "Satellite", render: (v: Vessel) => (
      <span className="font-mono text-[10.5px] text-muted">{v.satellite_link_status}</span>
    )},
    { key: "health", header: "Cyber Health", render: (v: Vessel) => (
      v.spoofing_detected || v.active_threats_count > 0
        ? <Badge variant="threat">{v.spoofing_detected ? "SPOOFING" : `${v.active_threats_count} threats`}</Badge>
        : <Badge variant="kernel">NORMAL</Badge>
    )},
    { key: "node", header: "Sentinel Node", render: (v: Vessel) => (
      <span className="font-mono text-[11px] text-muted">{v.connected_sentinel_node}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maritime Fleet"
        description="Vessel cyber-health over satellite links"
        breadcrumbs={[{ label: "Specialized CPS", href: "/fleet/maritime" }, { label: "Maritime Fleet" }]}
        actions={<Badge variant={vessels.live ? "kernel" : "muted"}>{vessels.data.length} vessels</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Satellite Bandwidth Saved</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{saved.toLocaleString()} MB</p>
          <p className="mt-1 font-mono text-[10px] text-muted">98.2% reduction via 32-dim latent vectors</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Spoofing Alerts</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-threat">
            {vessels.data.filter((v) => v.spoofing_detected).length}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">GPS jumps + AIS ghost vessels</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={vessels.data} keyExtractor={(v) => v.vessel_mmsi} />
      </Card>
    </div>
  );
}
