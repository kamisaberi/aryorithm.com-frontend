"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type Enclave } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_ENCLAVES } from "@/data/dummy";

export default function EnclavesPage() {
  const { token } = useAuth();
  const { data: enclaves, live } = useBackend<Enclave[]>(
    DUMMY_ENCLAVES,
    (t) =>
      backend.enclaves(t).then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error("Empty response");
        }
        return data;
      }),
    token
  );

  const totalNodes = enclaves.reduce((sum, e) => sum + e.node_count, 0);

  const columns = [
    { key: "enclave_id", header: "Enclave ID", render: (e: Enclave) => (
      <span className="font-mono text-[12px] text-ink">{e.enclave_id}</span>
    )},
    { key: "name", header: "Name", render: (e: Enclave) => (
      <span className="font-medium text-ink">{e.name}</span>
    )},
    { key: "max_latency_us", header: "Max Latency", render: (e: Enclave) => (
      <span className="tabular font-mono text-[12px] text-ink">{e.max_latency_us} µs</span>
    )},
    { key: "node_count", header: "Nodes", render: (e: Enclave) => (
      <span className="tabular font-mono text-[12px] text-ink">{e.node_count}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enclaves / OT"
        description="Operational technology enclaves and secure segmentation"
        breadcrumbs={[{ label: "Edge Appliances", href: "/fleet-nodes" }, { label: "Enclaves / OT" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {totalNodes} Nodes{live ? "" : " (cached)"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Total Enclaves</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{enclaves.length}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Total Nodes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{totalNodes}</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={enclaves} keyExtractor={(e) => e.enclave_id} />
      </Card>
    </div>
  );
}
