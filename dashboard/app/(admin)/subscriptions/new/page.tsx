"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { Subscription } from "@/types/admin";

export default function NewSubscriptionPage() {
  const [customer, setCustomer] = useState("");
  const [plan, setPlan] = useState<Subscription["plan"]>("pro");
  const [status, setStatus] = useState<Subscription["status"]>("active");
  const [mrr, setMrr] = useState("");
  const [started, setStarted] = useState("");
  const [renews, setRenews] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericMrr = Number(mrr);

    if (!customer.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!Number.isFinite(numericMrr) || numericMrr < 0) {
      setError("MRR must be zero or greater.");
      return;
    }
    if (!started || !renews) {
      setError("Start and renewal dates are required.");
      return;
    }

    setError(null);
    setCreated(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Subscription"
        description="Create a customer subscription record."
        breadcrumbs={[
          { label: "Management" },
          { label: "Subscriptions", href: "/subscriptions" },
          { label: "New Subscription" },
        ]}
        actions={<Button variant="secondary" href="/subscriptions">Back to Subscriptions</Button>}
      />

      {created ? (
        <Card className="p-8 text-center">
          <Badge variant="kernel">Draft ready</Badge>
          <h2 className="mt-4 font-display text-xl font-bold text-ink">Subscription draft created.</h2>
          <p className="mx-auto mt-2 max-w-lg text-[13px] leading-relaxed text-muted">
            {customer} has been added to the local subscription queue on the {plan} plan. Connect the billing
            backend to persist the subscription and start provisioning.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button href="/subscriptions">Return to subscriptions</Button>
            <Button variant="secondary" onClick={() => setCreated(false)}>Create another</Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="subscription-customer" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Customer
              </label>
              <input
                id="subscription-customer"
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                placeholder="Customer or workspace name"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="subscription-plan" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Plan
              </label>
              <select
                id="subscription-plan"
                value={plan}
                onChange={(event) => setPlan(event.target.value as Subscription["plan"])}
                className="admin-input w-full"
              >
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div>
              <label htmlFor="subscription-status" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Status
              </label>
              <select
                id="subscription-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as Subscription["status"])}
                className="admin-input w-full"
              >
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past due</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>

            <div>
              <label htmlFor="subscription-mrr" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Monthly recurring revenue (USD)
              </label>
              <input
                id="subscription-mrr"
                type="number"
                min="0"
                step="0.01"
                value={mrr}
                onChange={(event) => setMrr(event.target.value)}
                placeholder="0"
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="subscription-start" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Start date
              </label>
              <input
                id="subscription-start"
                type="date"
                value={started}
                onChange={(event) => setStarted(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="subscription-renewal" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Renewal date
              </label>
              <input
                id="subscription-renewal"
                type="date"
                value={renews}
                onChange={(event) => setRenews(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            {error && <p className="sm:col-span-2 text-[12px] text-threat">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5 sm:col-span-2">
              <Button variant="secondary" href="/subscriptions">Cancel</Button>
              <Button type="submit">Create Subscription</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
