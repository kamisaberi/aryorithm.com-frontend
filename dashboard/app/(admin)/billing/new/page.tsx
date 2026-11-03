"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";

export default function NewInvoicePage() {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState("open");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);

    if (!customer.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (!dueDate) {
      setError("Due date is required.");
      return;
    }

    setError(null);
    setCreated(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Invoice"
        description="Prepare a new billing record for a customer workspace."
        breadcrumbs={[
          { label: "Management" },
          { label: "Billing", href: "/billing" },
          { label: "New Invoice" },
        ]}
        actions={<Button variant="secondary" href="/billing">Back to Billing</Button>}
      />

      {created ? (
        <Card className="p-8 text-center">
          <Badge variant="kernel">Draft ready</Badge>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Invoice draft created.</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-muted">
            The invoice for {customer} has been prepared in the local console. Connect a billing backend to persist
            invoices and send them to customers.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/billing">Return to invoices</Button>
            <Button variant="secondary" onClick={() => setCreated(false)}>Create another</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="invoice-customer" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Customer
              </label>
              <input
                id="invoice-customer"
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Customer or workspace name"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="invoice-amount" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Amount (USD)
              </label>
              <input
                id="invoice-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="invoice-due" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Due date
              </label>
              <input
                id="invoice-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="invoice-status" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Initial status
              </label>
              <select
                id="invoice-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="admin-input w-full"
              >
                <option value="open">Open</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="invoice-notes" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Internal notes
              </label>
              <textarea
                id="invoice-notes"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for the billing team"
                className="admin-input w-full resize-y"
              />
            </div>

            {error && <p className="sm:col-span-2 text-[12px] text-threat">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5 sm:col-span-2">
              <Button variant="secondary" href="/billing">Cancel</Button>
              <Button type="submit">Create Invoice</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
