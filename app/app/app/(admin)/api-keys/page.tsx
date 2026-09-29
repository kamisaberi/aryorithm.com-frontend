import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { API_KEYS } from "@/data/admin";
import { ApiKey } from "@/types/admin";

const statusBadge = (status: ApiKey["status"]) => {
  return status === "active"
    ? <Badge variant="kernel">active</Badge>
    : <Badge variant="muted">revoked</Badge>;
};

export default function ApiKeysPage() {
  const columns = [
    { key: "name", header: "Name", render: (k: ApiKey) => (
      <div>
        <p className="font-medium text-ink">{k.name}</p>
        <p className="font-mono text-[10px] text-muted">{k.prefix}</p>
      </div>
    )},
    { key: "status", header: "Status", render: (k: ApiKey) => statusBadge(k.status) },
    { key: "requests", header: "Requests", render: (k: ApiKey) => (
      <span className="tabular font-mono text-[12px] text-ink">{k.requests.toLocaleString()}</span>
    )},
    { key: "created", header: "Created", render: (k: ApiKey) => (
      <span className="font-mono text-[11px] text-muted">{k.created}</span>
    )},
    { key: "lastUsed", header: "Last Used", render: (k: ApiKey) => (
      <span className="font-mono text-[11px] text-muted">{k.lastUsed}</span>
    )},
    { key: "actions", header: "", render: (k: ApiKey) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" href={`/api-keys/${k.id}`}>View</Button>
        {k.status === "active" && <Button variant="ghost" href={`/api-keys/${k.id}/revoke`}>Revoke</Button>}
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">API Keys</h1>
          <p className="mt-1 text-[13px] text-muted">{API_KEYS.length} keys total</p>
        </div>
        <Button variant="primary" href="/api-keys/new">+ New API Key</Button>
      </div>

      <Card>
        <Table columns={columns} data={API_KEYS} keyExtractor={(k) => k.id} />
      </Card>
    </div>
  );
}
