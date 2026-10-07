"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Table from "@/components/ui/Table";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type LicenseItem } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

type StatusFilter = "all" | "active" | "expired" | "revoked";
type KindFilter = "all" | "free" | "commercial";

const FALLBACK_LICENSES: LicenseItem[] = [
  {
    id: "lic-demo-1", license_id: "LIC-0000000000-DEM-AB12", customer_name: "Demo Lab",
    plan_slug: "community", license_kind: "free", hostname: "sentinel-node",
    max_nodes: 1, issued_at: 0, expires_at: 0, status: "active", revoked: false,
    authorized_modules: ["01_siem_core", "04_ids_ips", "15_ngfw", "19_swg", "22_dfir"],
    authorized_plugins: [], created_at: null,
  },
];

const STATUS_TABS: StatusFilter[] = ["all", "active", "expired", "revoked"];
const KIND_TABS: KindFilter[] = ["all", "free", "commercial"];
const PLAN_OPTIONS = ["community", "enterprise", "critical", "sovereign"];

function fmtExpiry(expiresAt: number): string {
  if (!expiresAt) return "Never";
  return new Date(expiresAt * 1000).toISOString().slice(0, 10);
}

function statusBadge(status: LicenseItem["status"]) {
  const map = { active: "kernel", expired: "threat", revoked: "muted" } as const;
  return <Badge variant={map[status as keyof typeof map] ?? "muted"}>{status}</Badge>;
}

export default function LicensesPage() {
  const { token } = useAuth();
  const licenses = useBackend<LicenseItem[]>(FALLBACK_LICENSES, (t) => backend.licenses(t), token);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [selected, setSelected] = useState<LicenseItem | null>(null);

  // subscribe form
  const [plan, setPlan] = useState("community");
  const [hwToken, setHwToken] = useState("");
  const [hostname, setHostname] = useState("sentinel-node");
  const [formError, setFormError] = useState<string | null>(null);
  const [formOk, setFormOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const counts = useMemo(() => {
    const data = licenses.data;
    return {
      total: data.length,
      active: data.filter((l) => l.status === "active").length,
      expired: data.filter((l) => l.status === "expired").length,
      free: data.filter((l) => l.license_kind === "free").length,
      commercial: data.filter((l) => l.license_kind === "commercial").length,
    };
  }, [licenses.data]);

  const visible = useMemo(
    () =>
      licenses.data.filter(
        (l) =>
          (statusFilter === "all" || l.status === statusFilter) &&
          (kindFilter === "all" || l.license_kind === kindFilter)
      ),
    [licenses.data, statusFilter, kindFilter]
  );

  const subscribe = async () => {
    setFormError(null);
    setFormOk(null);
    if (!hwToken.trim()) {
      setFormError("Hardware token is required (e.g. ARY-HW-421a88fc-…).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await backend.subscribeLicense(
        { plan_slug: plan, hardware_token: hwToken.trim(), hostname: hostname.trim() || "sentinel-node" },
        token
      );
      setFormOk(`Issued ${res.license_id} (${res.plan_slug}, ${res.lease_days === 0 ? "never expires" : `${res.lease_days}-day lease`}).`);
      setHwToken("");
      licenses.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Subscribe failed");
    } finally {
      setSubmitting(false);
    }
  };

  const download = async (item: LicenseItem) => {
    try {
      const detail = await backend.licenseDetail(item.license_id, token);
      const { blob, filename } = await backend.downloadLicense(detail.hardware_token, token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Download failed");
    }
  };

  const revoke = async (item: LicenseItem) => {
    try {
      await backend.revokeLicense(item.license_id, token);
      licenses.refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Revoke failed");
    }
  };

  const columns = [
    { key: "id", header: "License", render: (l: LicenseItem) => (
      <button type="button" onClick={() => setSelected(l)} className="font-mono text-[11px] text-cyan hover:underline">
        {l.license_id}
      </button>
    )},
    { key: "customer", header: "Customer", render: (l: LicenseItem) => (
      <span className="font-medium text-ink">{l.customer_name}</span>
    )},
    { key: "plan", header: "Plan", render: (l: LicenseItem) => (
      <Badge variant={l.plan_slug === "community" ? "muted" : "cyan"}>{l.plan_slug}</Badge>
    )},
    { key: "kind", header: "Type", render: (l: LicenseItem) => (
      <span className="font-mono text-[11px] text-muted">{l.license_kind}</span>
    )},
    { key: "status", header: "Status", render: (l: LicenseItem) => statusBadge(l.status) },
    { key: "nodes", header: "Nodes", render: (l: LicenseItem) => (
      <span className="tabular font-mono text-[12px] text-ink">{l.max_nodes}</span>
    )},
    { key: "expires", header: "Expires", render: (l: LicenseItem) => (
      <span className="font-mono text-[11px] text-muted">{fmtExpiry(l.expires_at)}</span>
    )},
    { key: "actions", header: "", render: (l: LicenseItem) => (
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={() => download(l)}>Download .lic</Button>
        {l.status === "active" && <Button variant="ghost" onClick={() => revoke(l)}>Revoke</Button>}
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licenses"
        description="All licenses — active and expired. Filter by status or free / commercial."
        actions={<Badge variant={licenses.live ? "kernel" : "muted"}>{licenses.live ? "Live" : "Cached"}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          ["Total", counts.total],
          ["Active", counts.active],
          ["Expired", counts.expired],
          ["Free", counts.free],
          ["Commercial", counts.commercial],
        ].map(([label, value]) => (
          <Card key={label} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Status:</span>
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors ${statusFilter === s ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {s === "all" ? `All (${counts.total})` : s}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Type:</span>
          {KIND_TABS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k)}
              className={`rounded-md border px-3 py-1.5 font-mono text-[11px] transition-colors ${kindFilter === k ? "border-cyan/60 text-cyan" : "border-hairline text-muted hover:text-ink"}`}
            >
              {k === "all" ? "All types" : k}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-muted">{visible.length} shown</span>
        </div>
      </Card>

      <Card>
        <Table columns={columns} data={visible} keyExtractor={(l) => l.id} />
      </Card>

      {selected && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-ink">{selected.license_id}</h2>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {selected.authorized_modules.length} modules · {selected.authorized_plugins.length} plugins · host {selected.hostname}
          </p>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="font-display text-lg font-bold text-ink">New license</h2>
        <p className="mt-1 text-[13px] text-muted">Any member can subscribe — community (free) or commercial.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Plan</span>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2 text-[13px] text-ink"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Hardware token</span>
            <input
              value={hwToken}
              onChange={(e) => setHwToken(e.target.value)}
              placeholder="ARY-HW-…"
              className="mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Hostname</span>
            <input
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              className="mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2 text-[13px] text-ink"
            />
          </label>
          <div className="flex items-end">
            <Button variant="primary" onClick={subscribe}>
              {submitting ? "Issuing…" : "+ Issue License"}
            </Button>
          </div>
        </div>
        {formError && <p className="mt-3 font-mono text-[11px] text-threat">{formError}</p>}
        {formOk && <p className="mt-3 font-mono text-[11px] text-kernel">{formOk}</p>}
      </Card>
    </div>
  );
}
