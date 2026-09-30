"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type Billing } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_BILLING } from "@/data/dummy";
import { INVOICES } from "@/data/admin";
import { Invoice } from "@/types/admin";

const statusBadge = (status: Invoice["status"]) => {
  const map = { paid: "kernel", open: "cyan", overdue: "threat", void: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function BillingPage() {
  const { token } = useAuth();
  const { data: billing, live } = useBackend<Billing>(
    DUMMY_BILLING,
    (tok: string) => backend.billing(tok),
    token
  );

  const utilization =
    billing.licensed_nodes > 0
      ? `${((billing.active_nodes / billing.licensed_nodes) * 100).toFixed(1)}%`
      : "0.0%";

  const columns = [
    { key: "id", header: "Invoice", render: (inv: Invoice) => (
      <span className="font-mono text-[11px] text-cyan">{inv.id}</span>
    )},
    { key: "customer", header: "Customer", render: (inv: Invoice) => (
      <span className="font-medium text-ink">{inv.customer}</span>
    )},
    { key: "amount", header: "Amount", render: (inv: Invoice) => (
      <span className="tabular font-mono text-[12px] text-ink">${inv.amount.toLocaleString()}</span>
    )},
    { key: "status", header: "Status", render: (inv: Invoice) => statusBadge(inv.status) },
    { key: "date", header: "Date", render: (inv: Invoice) => (
      <span className="font-mono text-[11px] text-muted">{inv.date}</span>
    )},
    { key: "due", header: "Due", render: (inv: Invoice) => (
      <span className="font-mono text-[11px] text-muted">{inv.due}</span>
    )},
    { key: "actions", header: "", render: (inv: Invoice) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" href={`/billing/${inv.id}`}>View</Button>
        {inv.status === "overdue" && <Button variant="ghost" href={`/billing/${inv.id}/remind`}>Remind</Button>}
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={`${INVOICES.length} invoices`}
        breadcrumbs={[{ label: "Management" }, { label: "Billing" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Active Nodes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{billing.active_nodes}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Licensed Nodes</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{billing.licensed_nodes}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Utilization</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{utilization}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Renewal Date</p>
          <p className="mt-2 font-mono text-lg font-bold text-kernel">
            {billing.renewal_date ? billing.renewal_date.slice(0, 10) : "—"}
          </p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">{INVOICES.length} invoices</p>
        <Button variant="primary" href="/billing/new">+ Create Invoice</Button>
      </div>

      <Card>
        <Table columns={columns} data={INVOICES} keyExtractor={(inv) => inv.id} />
      </Card>
    </div>
  );
}
