"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type FleetNode } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { api } from "@/lib/api";

const FALLBACK: FleetNode[] = [
  { node_id: "NODE-8fa901", site: "Substation-Alpha-North", hostname: "sentinel-substation-01", kernel_version: "6.8.0-45-generic", status: "ONLINE", cpu_pct: 14.2, ram_mb: 240, npu_temp_c: 48.5, packets_inspected: 150000, ebpf_drops: 48, mitigation_latency_us: 0.84, latency_us: 0.84, eps: 0, version: "", backend: "INTEL_OPENVINO", last_heartbeat_timestamp: null, sensors_count: 3 },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy node ID"
      className="font-mono text-[10px] text-muted transition-colors hover:text-cyan"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "copied" : "copy"}
    </button>
  );
}

function NodeActions({ node, token, onDone }: { node: FleetNode; token: string | null; onDone: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  const reboot = async () => {
    if (!token || busy) return;
    setBusy(true);
    try {
      const res = await api.post<{ status: string; node_id: string }>(
        `/fleet/nodes/${node.node_id}/restart`, { reason: "operator reboot from matrix" }, token
      );
      onDone(`${res.status} → ${res.node_id}`);
    } catch (e) {
      onDone(e instanceof Error ? e.message : "Reboot failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-2">
      <a href="/topology" className="font-mono text-[10.5px] text-cyan hover:underline">tree</a>
      <a href="/kernel-rules" className="font-mono text-[10.5px] text-cyan hover:underline">bpf map</a>
      <button type="button" disabled={busy} onClick={() => void reboot()} className="font-mono text-[10.5px] text-threat hover:underline disabled:opacity-50">
        {busy ? "…" : "reboot"}
      </button>
    </div>
  );
}

export default function AppliancesPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState("");
  const [backendFilter, setBackendFilter] = useState("");
  const [enclave, setEnclave] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const nodes = useBackend<FleetNode[]>(
    FALLBACK,
    (t) => backend.fleetNodes(t, {
      ...(status ? { status } : {}),
      ...(backendFilter ? { backend: backendFilter } : {}),
      ...(enclave ? { enclave_id: enclave } : {}),
    }),
    token,
    5000
  );

  const columns = [
    { key: "node", header: "Node", render: (n: FleetNode) => (
      <div>
        <p className="font-mono text-[12px] font-medium text-ink">{n.node_id} <CopyButton text={n.node_id} /></p>
        <p className="font-mono text-[10px] text-muted">{n.site}{n.hostname ? ` · ${n.hostname}` : ""}</p>
      </div>
    )},
    { key: "status", header: "Status", render: (n: FleetNode) => (
      n.status === "ONLINE"
        ? <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-kernel"><span className="h-1.5 w-1.5 rounded-full bg-kernel pip-pulse" />ONLINE</span>
        : <Badge variant={n.status === "OFFLINE" ? "threat" : "muted"}>{n.status}</Badge>
    )},
    { key: "telemetry", header: "Telemetry", render: (n: FleetNode) => (
      <span className="font-mono text-[11px] text-muted">
        CPU {(n.cpu_pct ?? 0).toFixed(1)}% · RAM {Math.round(n.ram_mb ?? 0)}MB · NPU {(n.npu_temp_c ?? 0).toFixed(1)}°C
      </span>
    )},
    { key: "drops", header: "eBPF Drops", render: (n: FleetNode) => (
      <span className="tabular font-mono text-[12px] text-ink">{n.ebpf_drops ?? 0}</span>
    )},
    { key: "sla", header: "SLA", render: (n: FleetNode) => (
      <span className="font-mono text-[11px] text-kernel">&lt; 1.0µs · {(n.mitigation_latency_us ?? 0).toFixed(2)}µs</span>
    )},
    { key: "actions", header: "Actions", render: (n: FleetNode) => (
      <NodeActions node={n} token={token} onDone={setMessage} />
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appliance Matrix"
        description="All registered edge appliances across enclaves"
        breadcrumbs={[{ label: "Edge Fleet", href: "/fleet/appliances" }, { label: "Appliance Matrix" }]}
        actions={<Badge variant={nodes.live ? "kernel" : "muted"}>{nodes.data.length} nodes{!nodes.live && " (cached)"}</Badge>}
      />
      <Card className="p-5">
        <div className="flex flex-wrap gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-input max-w-[180px]" aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
          <select value={backendFilter} onChange={(e) => setBackendFilter(e.target.value)} className="admin-input max-w-[200px]" aria-label="Filter by backend">
            <option value="">All backends</option>
            <option value="OpenVINO">OpenVINO</option>
            <option value="TensorRT">TensorRT</option>
            <option value="RKNN">RKNN</option>
          </select>
          <input value={enclave} onChange={(e) => setEnclave(e.target.value)} placeholder="Enclave ID filter" className="admin-input max-w-[220px] font-mono" aria-label="Filter by enclave" />
        </div>
        {message && <p className="mt-2 font-mono text-[11px] text-muted">{message}</p>}
      </Card>
      <Card>
        <Table columns={columns} data={nodes.data} keyExtractor={(n) => n.node_id} />
      </Card>
    </div>
  );
}
