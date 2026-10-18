"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ThreatGrid, type GridPeer, type CollectiveBusEntry } from "@/lib/backend";
import { DUMMY_BUS } from "@/data/dummy";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: ThreatGrid = {
  grid_id: "GRD-COLLECTIVE-01",
  peers: [
    { node_id: "NEXUS-FRA-01", site: "Frankfurt Enclave", status: "ONLINE", rules_synced: 1284, rtt_ms: 4.2 },
    { node_id: "NEXUS-IAD-02", site: "Ashburn Enclave", status: "ONLINE", rules_synced: 1284, rtt_ms: 6.1 },
    { node_id: "NEXUS-SIN-03", site: "Singapore Enclave", status: "ONLINE", rules_synced: 1279, rtt_ms: 11.7 },
    { node_id: "NEXUS-GRU-04", site: "Sao Paulo Enclave", status: "DEGRADED", rules_synced: 1241, rtt_ms: 28.4 },
    { node_id: "NEXUS-SYD-05", site: "Sydney Enclave", status: "ONLINE", rules_synced: 1284, rtt_ms: 9.8 },
  ],
  peers_online: 4,
  bus_rules_active: 12,
  p50_fanout_ms: 2.4,
  p99_fanout_ms: 4.7,
  sla_target_ms: 50.0,
  throughput_msgs_s: 1840.0,
  active_indicators: 0,
  last_sync_timestamp: 1774998120,
};

const statusVariant = (status: string): "kernel" | "telemetry" | "threat" =>
  status === "ONLINE" ? "kernel" : status === "DEGRADED" ? "telemetry" : "threat";

export default function ThreatGridPage() {
  const { token } = useAuth();
  const grid = useBackend<ThreatGrid>(FALLBACK, (t) => backend.threatGrid(t), token, 20000);
  const bus = useBackend<CollectiveBusEntry[]>(DUMMY_BUS, (t) => backend.collectiveBus(t), token, 20000);

  const g = grid.data;

  const peerColumns = [
    { key: "node", header: "Peer Node", render: (p: GridPeer) => (
      <div>
        <p className="font-mono text-[12px] text-ink">{p.node_id}</p>
        <p className="font-mono text-[10px] text-muted">{p.site}</p>
      </div>
    )},
    { key: "status", header: "Status", render: (p: GridPeer) => (
      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
    )},
    { key: "rules", header: "Rules Synced", render: (p: GridPeer) => (
      <span className="tabular font-mono text-[12px] text-ink">{p.rules_synced.toLocaleString()}</span>
    )},
    { key: "rtt", header: "RTT", render: (p: GridPeer) => (
      <span className={`tabular font-mono text-[12px] ${p.rtt_ms > 25 ? "text-[#FF8C1A]" : "text-ink"}`}>
        {p.rtt_ms.toFixed(1)} ms
      </span>
    )},
  ];

  const busColumns = [
    { key: "rule", header: "Rule ID", render: (b: CollectiveBusEntry) => (
      <span className="font-mono text-[11.5px] text-ink">{b.rule_id}</span>
    )},
    { key: "origin", header: "Origin Node", render: (b: CollectiveBusEntry) => (
      <span className="font-mono text-[11.5px] text-muted">{b.origin_node}</span>
    )},
    { key: "fanout", header: "Fanout Latency", render: (b: CollectiveBusEntry) => (
      <div className="flex items-center gap-2">
        <span className="tabular font-mono text-[12px] text-ink">{b.fanout_latency_ms.toFixed(1)} ms</span>
        <Badge variant={b.fanout_latency_ms <= g.sla_target_ms ? "kernel" : "threat"}>
          {b.fanout_latency_ms <= g.sla_target_ms ? "SLA OK" : "BREACH"}
        </Badge>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Collective Grid & Bus"
        description="gRPC fleet mesh and threat-bus fanout — attacked once, immune everywhere"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/grid" }, { label: "Collective Grid & Bus" }]}
        actions={<Badge variant={grid.live ? "kernel" : "muted"}>{grid.live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Peers Online</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {g.peers_online}<span className="text-muted">/{g.peers.length}</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">gRPC mesh · {g.grid_id}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">p99 Fanout</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{g.p99_fanout_ms} ms</p>
          <p className="mt-1 font-mono text-[10px] text-muted">SLA &lt; {g.sla_target_ms} ms · p50 {g.p50_fanout_ms} ms</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Bus Throughput</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {g.throughput_msgs_s >= 1000 ? `${(g.throughput_msgs_s / 1000).toFixed(1)}k` : g.throughput_msgs_s}
            <span className="text-muted text-base"> msg/s</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">{g.bus_rules_active} rules active</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Active Indicators</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{g.active_indicators}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">live global-feed rows</p>
        </Card>
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Mesh Peers</p>
        </div>
        <Table columns={peerColumns} data={g.peers} keyExtractor={(p) => p.node_id} />
      </Card>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Threat Bus Fanout Log</p>
        </div>
        <Table columns={busColumns} data={bus.data} keyExtractor={(b) => b.rule_id} />
      </Card>
    </div>
  );
}
