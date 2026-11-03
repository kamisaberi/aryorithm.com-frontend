"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { SUBSCRIPTIONS } from "@/data/admin";
import { Subscription } from "@/types/admin";

const statusBadge = (status: Subscription["status"]) => {
  const map = { active: "kernel", trialing: "cyan", past_due: "threat", canceled: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

const planBadge = (plan: Subscription["plan"]) => {
  const map = { starter: "muted", pro: "kernel", enterprise: "cyan" } as const;
  return <Badge variant={map[plan]}>{plan}</Badge>;
};

export default function ManageSubscriptionPage({ params }: { params: { id: string } }) {
  const subscription: Subscription =
    SUBSCRIPTIONS.find((item) => item.id === params.id) ?? {
      id: params.id,
      customer: "Unknown customer",
      plan: "starter",
      status: "active",
      mrr: 0,
      started: "—",
      renews: "—",
    };

  const [customer, setCustomer] = useState(subscription.customer);
  const [plan, setPlan] = useState<Subscription["plan"]>(subscription.plan);
  const [status, setStatus] = useState<Subscription["status"]>(subscription.status);
  const [mrr, setMrr] = useState(String(subscription.mrr));
  const [renews, setRenews] = useState(subscription.renews);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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

    setError(null);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Manage ${subscription.customer}`}
        description={`Subscription ${subscription.id}`}
        breadcrumbs={[
          { label: "Management" },
          { label: "Subscriptions", href: "/subscriptions" },
          { label: subscription.id },
        ]}
        actions={<Button variant="secondary" href="/subscriptions">Back to Subscriptions</Button>}
      />

      {saved && (
        <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4 text-[12.5px] text-kernel">
          Subscription changes saved in the cached console.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="p-6">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="manage-subscription-customer" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Customer
              </label>
              <input
                id="manage-subscription-customer"
                type="text"
                value={customer}
                onChange={(event) => setCustomer(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="manage-subscription-plan" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Plan
              </label>
              <select
                id="manage-subscription-plan"
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
              <label htmlFor="manage-subscription-status" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Status
              </label>
              <select
                id="manage-subscription-status"
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
              <label htmlFor="manage-subscription-mrr" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Monthly recurring revenue (USD)
              </label>
              <input
                id="manage-subscription-mrr"
                type="number"
                min="0"
                step="0.01"
                value={mrr}
                onChange={(event) => setMrr(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            <div>
              <label htmlFor="manage-subscription-renewal" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Renewal date
              </label>
              <input
                id="manage-subscription-renewal"
                type="date"
                value={renews === "—" ? "" : renews}
                onChange={(event) => setRenews(event.target.value)}
                className="admin-input w-full"
              />
            </div>

            {error && <p className="sm:col-span-2 text-[12px] text-threat">{error}</p>}

            <div className="flex flex-wrap justify-end gap-3 border-t border-hairline pt-5 sm:col-span-2">
              <Button variant="secondary" href="/subscriptions">Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Subscription</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {planBadge(plan)}
              {statusBadge(status)}
            </div>
            <dl className="mt-5 space-y-3 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Subscription ID</dt>
                <dd className="font-mono text-ink">{subscription.id}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Started</dt>
                <dd className="font-mono text-ink">{subscription.started}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Current MRR</dt>
                <dd className="font-mono text-ink">${subscription.mrr.toLocaleString()}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">Renews</dt>
                <dd className="font-mono text-ink">{subscription.renews}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-[15px] font-semibold text-ink">Billing notes</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
              Plan changes and cancellations are recorded here first. Connect the billing backend to sync them to
              the payment provider and license service.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
