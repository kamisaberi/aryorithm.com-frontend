"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import {
  backend,
  type FleetNode,
  type ThreatCoordinate,
  type ThreatEvent,
  type ThreatGrid,
} from "@/lib/backend";
import {
  DUMMY_FLEET_NODES,
  DUMMY_METRICS,
  DUMMY_THREAT_EVENTS,
  DUMMY_THREAT_MAP,
} from "@/data/dummy";

const FALLBACK_GRID: ThreatGrid = {
  grid_id: "GRD-COLLECTIVE-01",
  peers: [],
  peers_online: 0,
  bus_rules_active: 0,
  p50_fanout_ms: 2.4,
  p99_fanout_ms: 4.7,
  sla_target_ms: 50,
  throughput_msgs_s: 0,
  active_indicators: 0,
  last_sync_timestamp: 0,
};

function statusVariant(status: string): "kernel" | "telemetry" | "threat" | "muted" {
  const normalized = status.toUpperCase();
  if (normalized === "ONLINE" || normalized === "ACTIVE") return "kernel";
  if (normalized === "DEGRADED" || normalized.includes("FAULT")) return "telemetry";
  if (normalized === "OFFLINE" || normalized === "UNREACHABLE") return "threat";
  return "muted";
}

function MapCanvas({ coordinates, nodes }: { coordinates: ThreatCoordinate[]; nodes: FleetNode[] }) {
  const points = coordinates.length > 0
    ? coordinates
    : nodes.map((node, index) => ({
        site: node.site,
        lat: 50 + index * 4,
        lng: 4 + index * 5,
        active_threat: node.status.toUpperCase() !== "ONLINE",
      }));
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  return (
    <div className="relative h-[300px] overflow-hidden rounded-md border border-hairline bg-void/60">
      <div className="grid-backdrop absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/40 bg-cyan/5 glow-cyan" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan">
          NEXUS
        </div>
        {points.map((point, index) => {
          const left = 12 + ((point.lng - minLng) / spanLng) * 76;
          const top = 12 + ((maxLat - point.lat) / spanLat) * 76;
          const threat = point.active_threat;
          return (
            <div
              key={`${point.site}-${index}`}
              className="absolute"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div className="relative">
                <span
                  className={`absolute -left-3 -top-3 h-6 w-6 rounded-full blur-md ${
                    threat ? "bg-threat/50" : "bg-kernel/40"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`relative block h-2.5 w-2.5 rounded-full ${
                    threat ? "bg-threat" : "bg-kernel"
                  }`}
                />
              </div>
              <span
                className={`mt-1.5 block whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.1em] ${
                  threat ? "text-threat" : "text-muted"
                }`}
              >
                {point.site}
              </span>
            </div>
          );
        })}
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          {points.map((point, index) => {
            const x = 12 + ((point.lng - minLng) / spanLng) * 76;
            const y = 12 + ((maxLat - point.lat) / spanLat) * 76;
            return (
              <line
                key={`line-${point.site}-${index}`}
                x1="50%"
                y1="50%"
                x2={`${x}%`}
                y2={`${y}%`}
                stroke={point.active_threat ? "rgba(255,51,102,0.3)" : "rgba(0,229,255,0.16)"}
                strokeWidth="1"
                strokeDasharray={point.active_threat ? "3 3" : undefined}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { token } = useAuth();
  const metrics = useBackend(DUMMY_METRICS, (t) => backend.overviewMetrics(t), token, 10000);
  const threatMap = useBackend(DUMMY_THREAT_MAP, (t) => backend.threatMap(t), token, 15000);
  const nodes = useBackend(DUMMY_FLEET_NODES, (t) => backend.fleetNodes(t), token, 5000);
  const events = useBackend(DUMMY_THREAT_EVENTS, (t) => backend.threatEvents(t), token, 5000);
  const grid = useBackend(FALLBACK_GRID, (t) => backend.threatGrid(t), token, 15000);

  const online = nodes.data.filter((node) => node.status.toUpperCase() === "ONLINE").length;
  const totalDrops = nodes.data.reduce((sum, node) => sum + (node.ebpf_drops || 0), 0);
  const meanSla =
    nodes.data.length > 0
      ? nodes.data.reduce((sum, node) => sum + (node.mitigation_latency_us || node.latency_us || 0), 0) /
        nodes.data.length
      : metrics.data.mean_sla_us;

  const columns = [
    {
      key: "node",
      header: "Node / Site",
      render: (node: FleetNode) => (
        <div>
          <p className="font-mono text-[11.5px] text-ink">{node.node_id}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">{node.site}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (node: FleetNode) => (
        <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
      ),
    },
    {
      key: "arch",
      header: "Architecture / IF",
      render: (node: FleetNode) => (
        <span className="font-mono text-[10.5px] text-muted">
          {node.architecture || node.backend || "x86_64"} · {node.primary_interface || "ens160"}
        </span>
      ),
    },
    {
      key: "cpu",
      header: "CPU",
      render: (node: FleetNode) => (
        <span className="tabular font-mono text-[11px] text-ink">{node.cpu_pct.toFixed(1)}%</span>
      ),
    },
    {
      key: "drops",
      header: "eBPF drops",
      render: (node: FleetNode) => (
        <span className="tabular font-mono text-[11px] text-kernel">
          {(node.ebpf_drops || 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: "sla",
      header: "Latency SLA",
      render: (node: FleetNode) => (
        <span className="tabular font-mono text-[11px] text-cyan">
          {(node.mitigation_latency_us || node.latency_us || 0).toFixed(2)} µs
        </span>
      ),
    },
    {
      key: "blueprint",
      header: "Active blueprint",
      render: (node: FleetNode) => (
        <span className="font-mono text-[10px] text-muted">{node.active_blueprint || "sentinel-default"}</span>
      ),
    },
  ];

  const eventColumns = [
    {
      key: "time",
      header: "Detected",
      render: (event: ThreatEvent) => (
        <span className="font-mono text-[10px] text-muted">
          {new Date(event.detected_at).toLocaleTimeString([], { hour12: false })}
        </span>
      ),
    },
    {
      key: "ip",
      header: "Source",
      render: (event: ThreatEvent) => (
        <span className="font-mono text-[11px] text-ink">{event.attacker_ip}</span>
      ),
    },
    {
      key: "mitre",
      header: "ATT&CK",
      render: (event: ThreatEvent) =>
        event.mitre_id ? <Badge variant="telemetry">{event.mitre_id}</Badge> : <span className="text-muted">—</span>,
    },
    {
      key: "action",
      header: "Mitigation",
      render: (event: ThreatEvent) => (
        <Badge variant={event.dropped ? "kernel" : "threat"}>
          {event.dropped ? "XDP_DROP" : "HONEYNET"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Control Overview"
        description="Live fleet health, in-kernel mitigation telemetry and the collective threat picture"
        breadcrumbs={[{ label: "Mission Control", href: "/overview" }, { label: "Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={nodes.live ? "kernel" : "muted"}>{nodes.live ? "live" : "cached"}</Badge>
            <Link href="/fleet" className="admin-btn-secondary text-[11px]">
              Fleet command →
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nodes online</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {online}/{nodes.data.length || metrics.data.online_nodes}
          </p>
          <p className="mt-1 font-mono text-[10px] text-kernel">heartbeat ≤ 5s</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">In-kernel drops</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {(totalDrops || metrics.data.total_drops).toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">cumulative wire-speed mitigations</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Mean pipeline SLA</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{meanSla.toFixed(2)} µs</p>
          <p className="mt-1 font-mono text-[10px] text-muted">p99 {grid.data.p99_fanout_ms.toFixed(1)} ms fanout</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Active model</p>
          <p className="mt-2 font-display text-[18px] font-bold text-ink">
            {metrics.data.stable_model || "v2.4"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-kernel">golden gate recall 100%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Fleet topology</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">
                Nexus → enclave / site → edge appliance
              </p>
            </div>
            <Badge variant={threatMap.live ? "kernel" : "muted"}>
              {threatMap.live ? "position live" : "cached"}
            </Badge>
          </div>
          <div className="mt-4">
            <MapCanvas coordinates={threatMap.data.coordinates} nodes={nodes.data} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Grid peers</p>
              <p className="mt-1 font-mono text-[12px] text-ink">{grid.data.peers_online} online</p>
            </div>
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Bus rules</p>
              <p className="mt-1 font-mono text-[12px] text-ink">{grid.data.bus_rules_active}</p>
            </div>
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Fanout P50</p>
              <p className="mt-1 font-mono text-[12px] text-cyan">{grid.data.p50_fanout_ms.toFixed(1)} ms</p>
            </div>
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">IOCs active</p>
              <p className="mt-1 font-mono text-[12px] text-ink">{grid.data.active_indicators}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[14px] font-semibold text-ink">Collective defense</p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">real-time threat bus</p>
            </div>
            <Badge variant={events.live ? "kernel" : "muted"}>{events.live ? "live" : "cached"}</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {events.data.slice(0, 5).map((event) => (
              <div key={event.threat_id} className="rounded border border-hairline bg-void/40 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] text-ink">{event.attacker_ip}</span>
                  <Badge variant={event.dropped ? "kernel" : "threat"}>
                    {event.dropped ? "DROP" : "TRAP"}
                  </Badge>
                </div>
                <p className="mt-1 font-mono text-[9.5px] text-muted">
                  {event.mitre_id || "unclassified"} · {new Date(event.detected_at).toLocaleTimeString([], { hour12: false })}
                </p>
              </div>
            ))}
            {events.data.length === 0 && (
              <p className="font-mono text-[11px] text-muted">No active threat events in the current window.</p>
            )}
          </div>
          <Link href="/threats" className="mt-4 block text-center font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:underline">
            Open threat command →
          </Link>
        </Card>
      </div>

      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[13px] font-semibold text-ink">Live edge appliances</p>
            <Link href="/fleet" className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:underline">
              Manage fleet →
            </Link>
          </div>
        </div>
        <Table columns={columns} data={nodes.data} keyExtractor={(node) => node.node_id} />
      </Card>

      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-[13px] font-semibold text-ink">Threat event stream</p>
            <Badge variant={events.live ? "kernel" : "muted"}>{events.live ? "live · 5s" : "cached"}</Badge>
          </div>
        </div>
        <Table columns={eventColumns} data={events.data.slice(0, 8)} keyExtractor={(event) => event.threat_id} />
      </Card>
    </div>
  );
}
