import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";

const nodes = [
  { id: "nd_001", name: "EU-WEST-01", location: "Amsterdam", status: "online", eps: "1.25M", version: "v2.4.1" },
  { id: "nd_002", name: "EU-WEST-02", location: "Frankfurt", status: "online", eps: "980K", version: "v2.4.1" },
  { id: "nd_003", name: "EU-WEST-03", location: "Paris", status: "online", eps: "1.1M", version: "v2.4.0" },
  { id: "nd_004", name: "EU-WEST-04", location: "London", status: "degraded", eps: "450K", version: "v2.4.1" },
  { id: "nd_005", name: "US-EAST-01", location: "Virginia", status: "online", eps: "1.4M", version: "v2.4.1" },
  { id: "nd_006", name: "US-WEST-01", location: "Oregon", status: "online", eps: "890K", version: "v2.4.1" },
  { id: "nd_007", name: "APAC-01", location: "Tokyo", status: "maintenance", eps: "0", version: "v2.3.9" },
];

export default function FleetNodesPage() {
  const columns = [
    { key: "name", header: "Node", render: (n: typeof nodes[0]) => (
      <div>
        <p className="font-medium text-ink">{n.name}</p>
        <p className="font-mono text-[10px] text-muted">{n.location}</p>
      </div>
    )},
    { key: "status", header: "Status", render: (n: typeof nodes[0]) => (
      <Badge variant={n.status === "online" ? "kernel" : n.status === "degraded" ? "telemetry" : "muted"}>
        {n.status}
      </Badge>
    )},
    { key: "eps", header: "EPS", render: (n: typeof nodes[0]) => (
      <span className="tabular font-mono text-[12px] text-ink">{n.eps}</span>
    )},
    { key: "version", header: "Version", render: (n: typeof nodes[0]) => (
      <span className="font-mono text-[11px] text-muted">{n.version}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Nodes"
        description="Edge appliance fleet status and performance metrics"
        breadcrumbs={[{ label: "Edge Appliances", href: "/fleet-nodes" }, { label: "Fleet Nodes" }]}
        actions={<Badge variant="kernel">{nodes.filter(n => n.status === "online").length} Online</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Total Nodes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{nodes.length}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Total EPS</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">4.67M</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Avg Latency</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">0.84 µs</p>
        </Card>
      </div>
      <Card>
        <Table columns={columns} data={nodes} keyExtractor={(n) => n.id} />
      </Card>
    </div>
  );
}
