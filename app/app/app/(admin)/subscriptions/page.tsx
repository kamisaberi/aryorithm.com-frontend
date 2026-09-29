import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { SUBSCRIPTIONS } from "@/data/admin";
import { Subscription } from "@/types/admin";

const statusBadge = (status: Subscription["status"]) => {
  const map = { active: "kernel", trialing: "cyan", past_due: "threat", canceled: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function SubscriptionsPage() {
  const columns = [
    { key: "customer", header: "Customer", render: (s: Subscription) => (
      <span className="font-medium text-ink">{s.customer}</span>
    )},
    { key: "plan", header: "Plan", render: (s: Subscription) => (
      <Badge variant={s.plan === "enterprise" ? "cyan" : s.plan === "pro" ? "kernel" : "muted"}>
        {s.plan}
      </Badge>
    )},
    { key: "status", header: "Status", render: (s: Subscription) => statusBadge(s.status) },
    { key: "mrr", header: "MRR", render: (s: Subscription) => (
      <span className="tabular font-mono text-[12px] text-ink">
        {s.mrr > 0 ? `$${s.mrr.toLocaleString()}` : "—"}
      </span>
    )},
    { key: "started", header: "Started", render: (s: Subscription) => (
      <span className="font-mono text-[11px] text-muted">{s.started}</span>
    )},
    { key: "renews", header: "Renews", render: (s: Subscription) => (
      <span className="font-mono text-[11px] text-muted">{s.renews}</span>
    )},
    { key: "actions", header: "", render: (s: Subscription) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" href={`/subscriptions/${s.id}`}>Manage</Button>
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Subscriptions</h1>
          <p className="mt-1 text-[13px] text-muted">{SUBSCRIPTIONS.length} active subscriptions</p>
        </div>
        <Button variant="primary" href="/subscriptions/new">+ New Subscription</Button>
      </div>

      <Card>
        <Table columns={columns} data={SUBSCRIPTIONS} keyExtractor={(s) => s.id} />
      </Card>
    </div>
  );
}
