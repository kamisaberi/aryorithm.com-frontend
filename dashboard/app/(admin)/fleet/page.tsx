"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";
import {
  backend,
  type FiveGSlicingStatus,
  type FleetNode,
  type FleetNodeDetail,
  type SbomDriftEvent,
  type Topology,
} from "@/lib/backend";
import { DUMMY_FLEET_NODES } from "@/data/dummy";

const FALLBACK_SLICING: FiveGSlicingStatus = {
  framework: "NIS2 / 3GPP TS 33.501",
  standard: "5G slice isolation",
  generated_at: 0,
  overall_status: "UNKNOWN",
  compliance_score_pct: 0,
  slice_isolation_verified: false,
  nis2_article: "Art. 21",
  summary: {
    reporting_nodes: 0,
    active_teids: 0,
    gtp_slice_violations_dropped: 0,
    unmapped_teids_dropped: 0,
    total_dropped: 0,
    affected_nodes: 0,
  },
  s_nssai: [],
  findings: [],
  audited_nodes: 0,
};

const FALLBACK_TOPOLOGY: Topology = {
  tenant_id: "default",
  nexus: [],
  summary: {
    nexus_online: 0,
    nexus_offline: 0,
    nodes_online: 0,
    nodes_degraded: 0,
    nodes_offline: 0,
    nodes_unreachable: 0,
    sensors_active: 0,
    sensors_fault: 0,
    sensors_silent: 0,
  },
};

function statusVariant(status: string): "kernel" | "telemetry" | "threat" | "muted" {
  const value = status.toUpperCase();
  if (value === "ONLINE" || value === "ACTIVE" || value === "REPORTING") return "kernel";
  if (value === "DEGRADED" || value.includes("FAULT")) return "telemetry";
  if (value === "OFFLINE" || value === "UNREACHABLE") return "threat";
  return "muted";
}

function heartbeat(node: FleetNode): string {
  if (!node.last_heartbeat_timestamp) return "—";
  const seconds = Math.max(
    0,
    Math.round(Date.now() / 1000 - node.last_heartbeat_timestamp)
  );
  return seconds < 60 ? `${seconds}s ago` : `${Math.round(seconds / 60)}m ago`;
}

function pretty(value: string | null | undefined): string {
  if (!value) return "—";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function TopologyPanel({ nodes, topology }: { nodes: FleetNode[]; topology: Topology }) {
  const groups = useMemo(() => {
    const map = new Map<string, FleetNode[]>();
    for (const node of nodes) {
      const key = node.site || "Unassigned";
      map.set(key, [...(map.get(key) ?? []), node]);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [nodes]);

  const nexusOnline =
    topology.summary.nexus_online > 0 ||
    topology.nexus.some((item) => item.status.toUpperCase() === "ONLINE");

  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-void/60 p-5">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-display text-[13px] font-semibold text-ink">Enclave topology</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              Nexus → site enclave → registered edge appliance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={nexusOnline ? "kernel" : "telemetry"}>
              {nexusOnline ? "nexus online" : "nexus cached"}
            </Badge>
            <Link href="/topology" className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan hover:underline">
              full tree →
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <div className="rounded-md border border-cyan/40 bg-cyan/10 px-4 py-2 text-center glow-cyan">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan">sentinel-nexus</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              {topology.summary.nexus_online} online · {nodes.length} nodes
            </p>
          </div>
          <div className="h-5 w-px bg-cyan/30" aria-hidden="true" />
          <div className="h-px w-[calc(100%-2rem)] bg-hairline" aria-hidden="true" />
          <div className="mt-4 grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {groups.map(([site, siteNodes]) => {
              const online = siteNodes.filter((node) => node.status.toUpperCase() === "ONLINE").length;
              return (
                <div key={site} className="rounded-md border border-hairline bg-panel/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[10.5px] text-ink">{site}</p>
                      <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                        {online}/{siteNodes.length} healthy
                      </p>
                    </div>
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        online === siteNodes.length ? "bg-kernel" : online > 0 ? "bg-telemetry" : "bg-threat"
                      }`}
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    {siteNodes.slice(0, 4).map((node) => (
                      <div key={node.node_id} className="flex items-center justify-between gap-2">
                        <span className="truncate font-mono text-[9.5px] text-muted">{node.node_id}</span>
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            node.status.toUpperCase() === "ONLINE" ? "bg-kernel" : "bg-threat"
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    ))}
                    {siteNodes.length > 4 && (
                      <p className="font-mono text-[9px] text-muted">+{siteNodes.length - 4} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FleetCommandPage() {
  const { token } = useAuth();
  const nodes = useBackend<FleetNode[]>(DUMMY_FLEET_NODES, (t) => backend.fleetNodes(t), token, 5000);
  const topology = useBackend<Topology>(FALLBACK_TOPOLOGY, (t) => backend.topology(t), token, 20000);
  const slicing = useBackend<FiveGSlicingStatus>(FALLBACK_SLICING, (t) => backend.fiveGSlicing(t), token, 20000);
  const drift = useBackend<SbomDriftEvent[]>([], (t) => backend.sbomDriftEvents(t), token, 20000);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyNode, setBusyNode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [detailNode, setDetailNode] = useState<FleetNode | null>(null);
  const [detail, setDetail] = useState<FleetNodeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return nodes.data.filter((node) => {
      if (statusFilter !== "all" && node.status.toUpperCase() !== statusFilter) return false;
      if (!needle) return true;
      return [node.node_id, node.site, node.hostname, node.kernel_version, node.backend]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [nodes.data, query, statusFilter]);

  const online = nodes.data.filter((node) => node.status.toUpperCase() === "ONLINE").length;
  const meanSla =
    nodes.data.length > 0
      ? nodes.data.reduce((sum, node) => sum + (node.mitigation_latency_us || node.latency_us || 0), 0) /
        nodes.data.length
      : 0;
  const criticalDrift = drift.data.filter((event) => event.severity.toUpperCase() === "CRITICAL").length;

  async function restart(node: FleetNode) {
    if (!token || busyNode) return;
    const reason = window.prompt(
      `Restart sentinel daemon on ${node.node_id}? Enter an audit reason:`,
      "operator restart from fleet command"
    );
    if (!reason) return;
    setBusyNode(node.node_id);
    setMessage(null);
    try {
      const result = await backend.restartFleetNode(node.node_id, reason, token);
      setMessage(`Restart dispatched · ${result.node_id} · ${result.status}`);
      nodes.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Restart failed.");
    } finally {
      setBusyNode(null);
    }
  }

  async function decommission(node: FleetNode) {
    if (!token || busyNode) return;
    const ok = window.confirm(
      `Decommission ${node.node_id}?\n\nThis removes the appliance from the active fleet and detaches its sensors. Cryptographic audit records are retained.`
    );
    if (!ok) return;
    setBusyNode(node.node_id);
    setMessage(null);
    try {
      const result = await backend.decommissionFleetNode(node.node_id, token);
      setMessage(`Node decommissioned · ${result.node_id} · ${result.status}`);
      nodes.refresh();
      topology.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Decommission failed.");
    } finally {
      setBusyNode(null);
    }
  }

  async function diagnose(node: FleetNode) {
    if (!token) return;
    setDetailNode(node);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      setDetail(await backend.fleetNode(node.node_id, token));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Diagnostics endpoint unavailable.");
    } finally {
      setDetailLoading(false);
    }
  }

  const columns = [
    {
      key: "node",
      header: "Node / Site",
      render: (node: FleetNode) => (
        <div className="min-w-[170px]">
          <p className="font-mono text-[11.5px] font-medium text-ink">{node.node_id}</p>
          <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted">
            {node.hostname ? `${node.hostname} · ` : ""}
            {node.site}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (node: FleetNode) => (
        <div>
          <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
          <p className="mt-1 font-mono text-[9px] text-muted">{heartbeat(node)}</p>
        </div>
      ),
    },
    {
      key: "hardware",
      header: "Hardware / Interface",
      render: (node: FleetNode) => (
        <div>
          <p className="font-mono text-[10.5px] text-ink">{pretty(node.architecture || node.backend)}</p>
          <p className="mt-0.5 font-mono text-[9.5px] text-muted">
            {node.primary_interface || "ens160"} · kernel {node.kernel_version || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "telemetry",
      header: "CPU / RAM / NPU",
      render: (node: FleetNode) => (
        <div className="font-mono text-[10px] text-muted">
          <p>{(node.cpu_pct ?? 0).toFixed(1)}% CPU · {Math.round(node.ram_mb ?? 0)} MB</p>
          <p className="mt-0.5">{node.npu_temp_c != null ? `${node.npu_temp_c.toFixed(1)}°C NPU` : "NPU idle"}</p>
        </div>
      ),
    },
    {
      key: "security",
      header: "Slice / SBOM",
      render: (node: FleetNode) => {
        const slice = node.slicing_violations ?? 0;
        const sbom = node.sbom_drift_alerts ?? 0;
        return (
          <div className="space-y-1">
            <span
              className={`block font-mono text-[9.5px] ${
                slice > 0 ? "text-threat" : "text-kernel"
              }`}
            >
              {slice > 0 ? `${slice} slice violations` : "slice isolated"}
            </span>
            <span
              className={`block font-mono text-[9.5px] ${
                sbom > 0 ? "text-telemetry" : "text-muted"
              }`}
            >
              {sbom > 0 ? `${sbom} SBOM drift` : "SBOM clean"}
            </span>
          </div>
        );
      },
    },
    {
      key: "blueprint",
      header: "Pipeline / SLA",
      render: (node: FleetNode) => (
        <div>
          <p className="max-w-[150px] truncate font-mono text-[10px] text-cyan">
            {node.active_blueprint || "sentinel-default"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-kernel">
            {(node.mitigation_latency_us || node.latency_us || 0).toFixed(2)} µs
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (node: FleetNode) => (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void diagnose(node)}
            className="font-mono text-[10px] text-cyan hover:underline"
          >
            diag
          </button>
          <button
            type="button"
            disabled={busyNode === node.node_id || !token}
            onClick={() => void restart(node)}
            className="font-mono text-[10px] text-telemetry hover:underline disabled:opacity-40"
          >
            {busyNode === node.node_id ? "…" : "restart"}
          </button>
          <button
            type="button"
            disabled={busyNode === node.node_id || !token}
            onClick={() => void decommission(node)}
            className="font-mono text-[10px] text-threat hover:underline disabled:opacity-40"
          >
            remove
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Command"
        description="Hardware inventory, slice isolation, SBOM drift and remote lifecycle actions for every edge appliance"
        breadcrumbs={[{ label: "Edge Fleet", href: "/fleet" }, { label: "Command" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={nodes.live ? "kernel" : "muted"}>
              {nodes.live ? "live · 5s" : "cached"}
            </Badge>
            <Link href="/fleet/appliances" className="admin-btn-secondary text-[10px]">
              Appliance matrix
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Registered nodes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{nodes.data.length}</p>
          <p className="mt-1 font-mono text-[10px] text-kernel">{online} online</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Mean mitigation SLA</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{meanSla.toFixed(2)} µs</p>
          <p className="mt-1 font-mono text-[10px] text-muted">eBPF/XDP fast path</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">5G slice violations</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {slicing.data.summary.total_dropped.toLocaleString()}
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {slicing.data.summary.affected_nodes} affected · NIS2 Art. 21
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">SBOM drift alerts</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{drift.data.length}</p>
          <p className={`mt-1 font-mono text-[10px] ${criticalDrift > 0 ? "text-threat" : "text-kernel"}`}>
            {criticalDrift} critical W^X / inode events
          </p>
        </Card>
      </div>

      <TopologyPanel nodes={nodes.data} topology={topology.data} />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search node, site, hostname or kernel…"
            className="admin-input max-w-[320px] font-mono text-[11px]"
            aria-label="Search fleet nodes"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="admin-input max-w-[170px]"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="ONLINE">Online</option>
            <option value="DEGRADED">Degraded</option>
            <option value="OFFLINE">Offline</option>
          </select>
          <span className="font-mono text-[10px] text-muted">
            {filtered.length} / {nodes.data.length} nodes
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link href="/fleet-nodes" className="admin-btn-ghost text-[10px]">
              Provision token
            </Link>
            <button type="button" onClick={() => nodes.refresh()} className="admin-btn-secondary text-[10px]">
              Refresh live data
            </button>
          </div>
        </div>
        {message && (
          <p className="mt-3 rounded border border-cyan/20 bg-cyan/5 px-3 py-2 font-mono text-[10.5px] text-cyan">
            {message}
          </p>
        )}
        {nodes.error && !nodes.live && (
          <p className="mt-3 rounded border border-telemetry/20 bg-telemetry/5 px-3 py-2 font-mono text-[10.5px] text-telemetry">
            Live fleet endpoint unavailable: {nodes.error}. Showing last-known nodes.
          </p>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
          <div>
            <p className="font-display text-[13px] font-semibold text-ink">Edge appliance registry</p>
            <p className="mt-0.5 font-mono text-[10px] text-muted">
              Remote actions are audited; decommission is irreversible from this console.
            </p>
          </div>
          <Badge variant="muted">{filtered.length} rows</Badge>
        </div>
        <Table columns={columns} data={filtered} keyExtractor={(node) => node.node_id} />
      </Card>

      {detailNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-md border border-hairline bg-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                  Node diagnostics
                </p>
                <h2 className="mt-1 font-display text-[20px] font-bold text-ink">{detailNode.node_id}</h2>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {detailNode.site} · {detailNode.hostname || "no hostname"} · {detailNode.kernel_version || "kernel unknown"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailNode(null)}
                className="font-mono text-[12px] text-muted hover:text-ink"
                aria-label="Close diagnostics"
              >
                ✕
              </button>
            </div>

            {detailLoading && (
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Requesting authenticated diagnostics…
              </p>
            )}
            {detailError && (
              <p className="mt-5 rounded border border-telemetry/30 bg-telemetry/5 px-3 py-2 text-[12px] text-telemetry">
                {detailError}
              </p>
            )}
            {detail && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded border border-hairline bg-void/40 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Ring buffer</p>
                    <p className="mt-1 font-mono text-[13px] text-ink">{detail.ring_buffer_fill_pct.toFixed(1)}%</p>
                  </div>
                  <div className="rounded border border-hairline bg-void/40 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Kernel drops</p>
                    <p className="mt-1 font-mono text-[13px] text-ink">{detail.kernel_drops.toLocaleString()}</p>
                  </div>
                  <div className="rounded border border-hairline bg-void/40 p-3">
                    <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Sensors</p>
                    <p className="mt-1 font-mono text-[13px] text-ink">{detail.sensors.length}</p>
                  </div>
                </div>
                <div className="rounded border border-hairline bg-void/40 p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Hardware envelope</p>
                  <pre className="mt-2 overflow-x-auto font-mono text-[10.5px] leading-relaxed text-ink">
                    {JSON.stringify(detail.hardware, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Sensors</p>
                  <div className="mt-2 space-y-2">
                    {detail.sensors.map((sensor) => (
                      <div
                        key={sensor.sensor_id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-hairline bg-void/40 px-3 py-2"
                      >
                        <div>
                          <p className="font-mono text-[11px] text-ink">{sensor.name}</p>
                          <p className="font-mono text-[9.5px] text-muted">
                            {sensor.sensor_id} · {sensor.protocol} · {sensor.ip_address || "no IP"}
                          </p>
                        </div>
                        <Badge variant={statusVariant(sensor.status)}>{sensor.status}</Badge>
                      </div>
                    ))}
                    {detail.sensors.length === 0 && (
                      <p className="font-mono text-[11px] text-muted">No sensors registered on this node.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailNode(null)}
                className="admin-btn-secondary text-[10px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
