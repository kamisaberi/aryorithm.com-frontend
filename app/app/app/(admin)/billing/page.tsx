import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import { INVOICES } from "@/data/admin";
import { Invoice } from "@/types/admin";

const statusBadge = (status: Invoice["status"]) => {
  const map = { paid: "kernel", open: "cyan", overdue: "threat", void: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function BillingPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Billing</h1>
          <p className="mt-1 text-[13px] text-muted">{INVOICES.length} invoices</p>
        </div>
        <Button variant="primary" href="/billing/new">+ Create Invoice</Button>
      </div>

      <Card>
        <Table columns={columns} data={INVOICES} keyExtractor={(inv) => inv.id} />
      </Card>
    </div>
  );
}
