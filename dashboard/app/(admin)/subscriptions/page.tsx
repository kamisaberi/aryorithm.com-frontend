"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import PageHeader from "@/components/ui/PageHeader";
import { SUBSCRIPTIONS } from "@/data/admin";
import { Subscription } from "@/types/admin";
import { backend, type PlansMatrix } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const statusBadge = (status: Subscription["status"]) => {
  const map = { active: "kernel", trialing: "cyan", past_due: "threat", canceled: "muted" } as const;
  return <Badge variant={map[status]}>{status}</Badge>;
};

const FALLBACK_MATRIX: PlansMatrix = {
  plans: [
    { slug: "community", name: "Community / Research", price_month_cents: 0, price_display: "€0", per_node: false, target: "Developers, Academia", deployment: "Self-Hosted", node_capacity: "Max 1 Node", licensing: "FOSS", support: "Community", cta_label: "", cta_href: "", sort_order: 0 },
    { slug: "enterprise", name: "Enterprise IT", price_month_cents: 29900, price_display: "€299", per_node: true, target: "Corporate IT", deployment: "Cloud Hybrid", node_capacity: "Unlimited", licensing: "SaaS JWT", support: "99.9% SLA", cta_label: "", cta_href: "", sort_order: 1 },
    { slug: "critical", name: "Critical Infrastructure (OT)", price_month_cents: 69900, price_display: "€699", per_node: true, target: "Substation, Factory", deployment: "Hybrid / Air-Gapped", node_capacity: "Unlimited", licensing: ".lic", support: "24/7 L3", cta_label: "", cta_href: "", sort_order: 2 },
    { slug: "sovereign", name: "Sovereign Defense", price_month_cents: null, price_display: "Custom", per_node: true, target: "Defense, Classified", deployment: "Air-Gapped", node_capacity: "Unlimited", licensing: "Dongle", support: "On-Site", cta_label: "", cta_href: "", sort_order: 3 },
  ],
  items: [],
};

const CATEGORY_LABELS: Record<string, string> = {
  software_tier: "Core Software Tiers",
  security_subsystem: "Security Subsystems",
  industrial_plugin: "Industrial Plugins",
  cloud_saas: "Cloud SaaS Services",
};

function fmtPrice(cents: number | null, display: string): string {
  if (cents === null) return display;
  if (cents === 0) return "€0";
  return `€${(cents / 100).toLocaleString("en-US")}/mo`;
}

function Cell({ value }: { value: string }) {
  const v = value ?? "—";
  if (v.startsWith("✔")) {
    const rest = v.slice(1).trim();
    return (
      <span className="text-kernel">
        ✔{rest && rest.toLowerCase() !== "included" ? <span className="ml-1 text-[10.5px] text-muted">{rest}</span> : null}
      </span>
    );
  }
  if (v.startsWith("✖")) {
    const rest = v.slice(1).trim();
    return (
      <span className="text-muted/50">
        ✖{rest ? <span className="ml-1 text-[10.5px] text-muted">{rest}</span> : null}
      </span>
    );
  }
  return <span className="text-[11px] text-ink">{v}</span>;
}

export default function SubscriptionsPage() {
  const { token } = useAuth();
  const matrix = useBackend<PlansMatrix>(FALLBACK_MATRIX, (t) => backend.plans(t), token);
  const [cat, setCat] = useState("all");
  const plans = [...matrix.data.plans].sort((a, b) => a.sort_order - b.sort_order);
  const cats = Object.keys(CATEGORY_LABELS).filter((c) =>
    matrix.data.items.some((i) => i.category === c)
  );
  const rows = matrix.data.items.filter((i) => cat === "all" || i.category === cat);

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
      <PageHeader
        title="Subscriptions"
        description="Live plan catalog from the backend plus customer subscriptions"
        actions={<Badge variant={matrix.live ? "kernel" : "muted"}>{matrix.live ? "Live catalog" : "Cached catalog"}</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.slug} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">{p.name}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
              {fmtPrice(p.price_month_cents, p.price_display)}
              {p.price_month_cents ? <span className="text-[11px] font-normal text-muted"> /node/mo</span> : null}
            </p>
            <p className="mt-2 text-[12px] text-muted">{p.target}</p>
            <p className="mt-1 font-mono text-[10.5px] text-muted">{p.deployment} · {p.node_capacity}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          {["all", ...cats].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors ${cat === c ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {c === "all" ? `All (${matrix.data.items.length})` : `${CATEGORY_LABELS[c]} (${matrix.data.items.filter((i) => i.category === c).length})`}
            </button>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-3 py-2">Capability</th>
                {plans.map((p) => (
                  <th key={p.slug} className="px-3 py-2">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[11.5px]">
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-hairline/60 last:border-0">
                  <td className="px-3 py-2">
                    <span className="block text-[12px] text-ink">{row.item_label}</span>
                    {row.item_sub && <span className="mt-0.5 block text-[10.5px] text-muted">{row.item_sub}</span>}
                  </td>
                  {plans.map((p) => (
                    <td key={p.slug} className="whitespace-nowrap px-3 py-2"><Cell value={row.values[p.slug] ?? "—"} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Customer subscriptions</h2>
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
