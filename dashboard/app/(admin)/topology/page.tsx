"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type Topology, type TopologyNexus, type TopologyNode, type TopologySensor } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

type StatusVariant = "kernel" | "threat" | "telemetry" | "cyan" | "muted";

function statusVariant(status: string): StatusVariant {
  if (status === "ONLINE" || status === "ACTIVE") return "kernel";
  if (status === "DEGRADED" || status.includes("FAULT")) return "telemetry";
  if (status === "OFFLINE") return "threat";
  return "muted"; // UNREACHABLE, SILENT, MAINTENANCE
}

function StatusPill({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

const FALLBACK_TOPOLOGY: Topology = {
  tenant_id: "demo",
  nexus: [
    {
      nexus_id: "NEXUS-LOCAL",
      version: "1.0.0",
      status: "ONLINE",
      last_seen_sec_ago: 2,
      nodes: [
        {
          node_id: "NODE-8fa901",
          site: "PowerGrid-North-01",
          hostname: "sentinel-substation-01",
          reported_status: "ONLINE",
          status: "ONLINE",
          cpu_pct: 14.2,
          ebpf_drops: 48,
          mitigation_latency_us: 0.84,
          last_heartbeat_sec_ago: 2,
          sensors: [
            { sensor_id: "PLC-000C29A1-UNIT1", name: "Main Transformer PLC (Siemens S7)", type: "INDUSTRIAL_PLC", protocol: "MODBUS_TCP", ip_address: "192.168.1.10", reported_status: "ACTIVE", status: "ACTIVE", last_packet_seen_sec_ago: 0.2 },
            { sensor_id: "COIL-105-VALVE", name: "Cooling Valve Pressure Actuator", type: "SCADA_ACTUATOR", protocol: "MODBUS_TCP", ip_address: "192.168.1.10", reported_status: "ACTIVE", status: "ACTIVE", last_packet_seen_sec_ago: 0.4 },
            { sensor_id: "CAM-PERIMETER-CH01", name: "Substation Yard Thermal Camera", type: "OPTICAL_VISION", protocol: "RTSP_H264", ip_address: "192.168.1.50", reported_status: "FAULT_NO_DATA", status: "FAULT_NO_DATA", last_packet_seen_sec_ago: 45.0 },
          ],
        },
        {
          node_id: "NODE-c34b12",
          site: "Metro-General-Hospital",
          hostname: "sentinel-hospital-pacs",
          reported_status: "ONLINE",
          status: "ONLINE",
          cpu_pct: 18.7,
          ebpf_drops: 35,
          mitigation_latency_us: 0.79,
          last_heartbeat_sec_ago: 1,
          sensors: [
            { sensor_id: "DICOM-MRI_DEPT1-10.0.1.50", name: "Radiology MRI Scanner", type: "MEDICAL_PACS", protocol: "DICOM_C_STORE", ip_address: "10.0.1.50", reported_status: "ACTIVE", status: "ACTIVE", last_packet_seen_sec_ago: 1.1 },
          ],
        },
      ],
    },
  ],
  summary: {
    nexus_online: 1, nexus_offline: 0,
    nodes_online: 2, nodes_degraded: 0, nodes_offline: 0, nodes_unreachable: 0,
    sensors_active: 3, sensors_fault: 1, sensors_silent: 0,
  },
};

function SensorRow({ sensor }: { sensor: TopologySensor }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline px-4 py-2.5 first:border-t-0">
      <span className="font-mono text-[11px] font-medium text-ink">{sensor.sensor_id}</span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{sensor.name}</span>
      <span className="hidden font-mono text-[10px] text-muted lg:inline">
        {sensor.type} · {sensor.protocol}{sensor.ip_address ? ` · ${sensor.ip_address}` : ""}
      </span>
      <StatusPill status={sensor.status} />
    </div>
  );
}

function NodeBlock({ node }: { node: TopologyNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-void/40">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
        <span className="font-mono text-[12px] font-bold text-ink">{node.node_id}</span>
        <span className="text-[12px] text-muted">{node.site}{node.hostname ? ` · ${node.hostname}` : ""}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted">
            CPU {node.cpu_pct.toFixed(1)}% · eBPF {node.mitigation_latency_us.toFixed(2)}µs · drops {node.ebpf_drops}
          </span>
          <StatusPill status={node.status} />
        </span>
      </div>
      <div>
        {node.sensors.length === 0 ? (
          <p className="border-t border-hairline px-4 py-2 font-mono text-[10px] text-muted">no sensors reported</p>
        ) : (
          node.sensors.map((s) => <SensorRow key={s.sensor_id} sensor={s} />)
        )}
      </div>
    </div>
  );
}

function NexusBlock({ nexus }: { nexus: TopologyNexus }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-[13px] font-bold text-ink">▼ {nexus.nexus_id}</span>
        <span className="font-mono text-[10px] text-muted">v{nexus.version}</span>
        <span className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px] text-muted">
            {nexus.last_seen_sec_ago != null ? `seen ${nexus.last_seen_sec_ago.toFixed(0)}s ago` : "never seen"}
          </span>
          <StatusPill status={nexus.status} />
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {nexus.nodes.length === 0 ? (
          <p className="font-mono text-[11px] text-muted">no appliances reporting</p>
        ) : (
          nexus.nodes.map((n) => <NodeBlock key={n.node_id} node={n} />)
        )}
      </div>
    </Card>
  );
}

export default function TopologyPage() {
  const { token } = useAuth();
  // Same 5s cadence as POST /fleet/sync — the tree is always the last update.
  const topo = useBackend<Topology>(FALLBACK_TOPOLOGY, (t) => backend.topology(t), token, 5000);
  const s = topo.data.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Topology"
        description="Live 4-tier hierarchy: tenant → nexus → sentinel appliances → sensors"
        breadcrumbs={[{ label: "Edge Appliances", href: "/topology" }, { label: "Topology" }]}
        actions={<Badge variant={topo.live ? "kernel" : "muted"}>{topo.live ? "Live" : "Cached"}</Badge>}
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nexus Hubs</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            <span className="text-kernel">{s.nexus_online}</span>
            <span className="text-muted"> / {s.nexus_online + s.nexus_offline}</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">online / total</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Appliances</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            <span className="text-kernel">{s.nodes_online}</span>
            {s.nodes_degraded > 0 && <span className="text-telemetry"> +{s.nodes_degraded}▲</span>}
            {s.nodes_offline > 0 && <span className="text-threat"> +{s.nodes_offline}▼</span>}
            {s.nodes_unreachable > 0 && <span className="text-muted"> +{s.nodes_unreachable}?</span>}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">on / degraded / off / unreachable</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Sensors</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            <span className="text-kernel">{s.sensors_active}</span>
            {s.sensors_fault > 0 && <span className="text-telemetry"> +{s.sensors_fault}▲</span>}
            {s.sensors_silent > 0 && <span className="text-muted"> +{s.sensors_silent}…</span>}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">active / fault / silent</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Sync Health</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {topo.data.nexus.length > 0
              ? `${Math.min(...topo.data.nexus.map((n) => n.last_seen_sec_ago ?? 999)).toFixed(0)}s`
              : "—"}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">since last heartbeat (stale &gt; 30s)</p>
        </Card>
      </div>
      {topo.data.nexus.length === 0 ? (
        <Card className="p-5">
          <p className="font-mono text-[11px] text-muted">No topology synced yet — waiting for the first /fleet/sync heartbeat.</p>
        </Card>
      ) : (
        topo.data.nexus.map((nx) => <NexusBlock key={nx.nexus_id} nexus={nx} />)
      )}
    </div>
  );
}
