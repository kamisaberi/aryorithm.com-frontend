"use client";

import { useState } from "react";
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

export default function RemindInvoicePage({ params }: { params: { id: string } }) {
  const invoice: Invoice =
    INVOICES.find((item) => item.id === params.id) ?? {
      id: params.id,
      customer: "Unknown customer",
      amount: 0,
      status: "open",
      date: "—",
      due: "—",
    };
  const [sent, setSent] = useState(false);
  const invoiceHref = `/billing/${encodeURIComponent(invoice.id)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Payment Reminder"
        description={`Prepare a collection reminder for ${invoice.customer}.`}
        breadcrumbs={[
          { label: "Management" },
          { label: "Billing", href: "/billing" },
          { label: invoice.id, href: invoiceHref },
          { label: "Reminder" },
        ]}
        actions={<Button variant="secondary" href={invoiceHref}>Back to Invoice</Button>}
      />

      {sent && (
        <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4 text-[12.5px] text-kernel">
          Reminder queued for {invoice.customer}. The billing backend will deliver it to the customer contact.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Invoice</p>
              <h2 className="mt-1 font-display text-lg font-bold text-ink">{invoice.id}</h2>
            </div>
            {statusBadge(invoice.status)}
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Customer</p>
              <p className="mt-1 text-[13px] text-ink">{invoice.customer}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Outstanding amount</p>
              <p className="tabular mt-1 font-mono text-lg font-bold text-ink">${invoice.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Original due date</p>
              <p className="mt-1 font-mono text-[13px] text-ink">{invoice.due}</p>
            </div>
          </div>

          <div className="mt-7 rounded-md border border-hairline bg-void/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Message preview</p>
            <p className="mt-3 text-[13px] leading-relaxed text-ink">
              Hi {invoice.customer}, this is a friendly reminder that invoice {invoice.id} for $
              {invoice.amount.toLocaleString()} is due on {invoice.due}. Please let us know if you need a copy of
              the invoice or have any questions.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {!sent ? (
              <Button onClick={() => setSent(true)}>Queue Reminder</Button>
            ) : (
              <Badge variant="kernel">Reminder queued</Badge>
            )}
            <Button variant="secondary" href={invoiceHref}>Cancel</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-[15px] font-semibold text-ink">Before you send</h2>
          <ul className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-muted">
            <li>Confirm the customer contact on the invoice is current.</li>
            <li>Check whether payment has arrived but not yet been reconciled.</li>
            <li>Use the invoice page to review the full billing record.</li>
          </ul>
          <p className="mt-5 border-t border-hairline pt-4 font-mono text-[10.5px] leading-relaxed text-muted">
            This action uses cached invoice data. Connect the billing service to send real email.
          </p>
        </Card>
      </div>
    </div>
  );
}
