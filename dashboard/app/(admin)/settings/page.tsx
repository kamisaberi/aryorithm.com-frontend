"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type Webhook } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_WEBHOOKS } from "@/data/dummy";

function WebhookSection() {
  const { token } = useAuth();
  const { data: webhooks, live, refresh } = useBackend<Webhook[]>(
    DUMMY_WEBHOOKS,
    (tok: string) => backend.webhooks(tok),
    token
  );
  const [url, setUrl] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    const trimmed = url.trim();
    if (!trimmed || !token || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await backend.createWebhook(
        { url: trimmed, events: ["threat.drop"] },
        token
      );
      setCreatedId(res.webhook_id);
      setUrl("");
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create webhook");
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { key: "id", header: "ID", render: (w: Webhook) => (
      <span className="font-mono text-[11px] text-cyan">{w.id}</span>
    )},
    { key: "url", header: "URL", render: (w: Webhook) => (
      <span className="break-all font-mono text-[11px] text-ink">{w.url}</span>
    )},
  ];

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[15px] font-semibold text-ink">Webhooks</h2>
        <Badge variant={live ? "kernel" : "muted"}>
          {live ? "Live" : "Cached"}
        </Badge>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://siem.corp.internal/hooks"
          className="admin-input flex-1"
        />
        <Button variant="primary" onClick={() => void handleCreate()}>
          {creating ? "Adding…" : "Add Webhook"}
        </Button>
      </div>
      {error && <p className="mt-3 text-[12px] text-threat">{error}</p>}
      {createdId && (
        <p className="mt-3 break-all rounded border border-hairline bg-panel p-3 font-mono text-[12px] text-ink">
          Created webhook: {createdId}
        </p>
      )}
      <div className="mt-4">
        <Table columns={columns} data={webhooks} keyExtractor={(w) => w.id} />
      </div>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform configuration and preferences"
        breadcrumbs={[{ label: "System" }, { label: "Settings" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* General */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">General</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Platform Name
              </label>
              <input type="text" defaultValue="Aryorithm SaaS" className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Support Email
              </label>
              <input type="email" defaultValue="support@aryorithm.com" className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Default Plan
              </label>
              <select className="admin-input">
                <option>Starter</option>
                <option>Pro</option>
                <option>Enterprise</option>
              </select>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Security</h2>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">Two-Factor Authentication</p>
                <p className="text-[11.5px] text-muted">Require 2FA for all admin users</p>
              </div>
              <button type="button" className="relative h-6 w-11 rounded-full bg-cyan/20 transition-colors" aria-label="Toggle 2FA">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cyan transition-transform" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">Session Timeout</p>
                <p className="text-[11.5px] text-muted">Auto-logout after inactivity</p>
              </div>
              <select className="admin-input w-32">
                <option>30 min</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">IP Allowlist</p>
                <p className="text-[11.5px] text-muted">Restrict access to specific IPs</p>
              </div>
              <Button variant="secondary" href="/settings/ip-allowlist">Configure</Button>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* API */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">API Configuration</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Rate Limit (req/min)
              </label>
              <input type="number" defaultValue={1000} className="admin-input" />
            </div>
            <div>
              <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Max API Keys per User
              </label>
              <input type="number" defaultValue={5} className="admin-input" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-ink">API v2 Beta</p>
                <p className="text-[11.5px] text-muted">Enable v2 endpoints for testing</p>
              </div>
              <button type="button" className="relative h-6 w-11 rounded-full bg-hairline transition-colors" aria-label="Toggle API v2">
                <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-muted transition-transform" />
              </button>
            </div>
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>

        {/* Notifications */}
        <Card className="p-5">
          <h2 className="font-display text-[15px] font-semibold text-ink">Notifications</h2>
          <div className="mt-4 space-y-4">
            {[
              { label: "New user signups", desc: "Get notified when a new user registers" },
              { label: "Failed payments", desc: "Alert on overdue or failed invoices" },
              { label: "API anomalies", desc: "Unusual API usage patterns" },
              { label: "Security alerts", desc: "Suspicious login attempts" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-ink">{item.label}</p>
                  <p className="text-[11.5px] text-muted">{item.desc}</p>
                </div>
                <button type="button" className="relative h-6 w-11 rounded-full bg-cyan/20 transition-colors" aria-label={`Toggle ${item.label}`}>
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-cyan transition-transform" />
                </button>
              </div>
            ))}
            <Button variant="primary">Save Changes</Button>
          </div>
        </Card>
      </div>

      <WebhookSection />
    </div>
  );
}
