import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { INVOICES } from "@/data/admin";
import { Invoice } from "@/types/admin";

const statusBadge = (status: Invoice["status"]) => {
  const map = { paid: "kernel", open: "cyan", overdue: "threat", void: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice: Invoice =
    INVOICES.find((item) => item.id === params.id) ?? {
      id: params.id,
      customer: "Unknown customer",
      amount: 0,
      status: "open",
      date: "—",
      due: "—",
    };
  const invoiceHref = `/billing/${encodeURIComponent(invoice.id)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.id}`}
        description="Invoice details and collection actions."
        breadcrumbs={[
          { label: "Management" },
          { label: "Billing", href: "/billing" },
          { label: invoice.id },
        ]}
        actions={<Button variant="secondary" href="/billing">Back to Billing</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Invoice</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{invoice.id}</h2>
            </div>
            {statusBadge(invoice.status)}
          </div>

          <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Customer</dt>
              <dd className="mt-1 text-[13px] font-medium text-ink">{invoice.customer}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Amount</dt>
              <dd className="tabular mt-1 font-mono text-lg font-bold text-ink">
                ${invoice.amount.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Issued</dt>
              <dd className="mt-1 font-mono text-[13px] text-ink">{invoice.date}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Due</dt>
              <dd className="mt-1 font-mono text-[13px] text-ink">{invoice.due}</dd>
            </div>
          </dl>

          <div className="mt-8 rounded-md border border-hairline bg-void/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Line item</p>
            <div className="mt-3 flex items-center justify-between gap-4 text-[13px]">
              <span className="text-ink">Platform subscription</span>
              <span className="tabular font-mono text-ink">${invoice.amount.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <h2 className="font-display text-[15px] font-semibold text-ink">Actions</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Send a payment reminder or return to the invoice list.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button href={`${invoiceHref}/remind`}>Send Reminder</Button>
              <Button variant="secondary" href="/billing">Back to Invoices</Button>
            </div>
          </Card>

          <Card className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Collection notes</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Reminder delivery is handled by the billing backend. This console uses cached invoice data when the
              live billing service is unavailable.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
