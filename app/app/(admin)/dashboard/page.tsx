"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { STATS, ACTIVITIES, SUBSCRIPTIONS } from "@/data/admin";

interface OverviewMetrics {
  online_nodes: number;
  total_drops: number;
  mean_sla_us: number;
  stable_model: string;
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<typeof STATS | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    api
      .get<OverviewMetrics>("/overview/metrics", token)
      .then((data) => {
        setMetrics([
          { label: "Online Nodes", value: String(data.online_nodes), change: "+8.2%", trend: "up" as const, icon: "▣" },
          { label: "Total Drops", value: data.total_drops.toLocaleString(), change: "+23.1%", trend: "up" as const, icon: "◉" },
          { label: "Mean SLA", value: `${data.mean_sla_us} µs`, change: "-0.4%", trend: "down" as const, icon: "⚿" },
          { label: "Stable Model", value: data.stable_model, change: "v2.4", trend: "neutral" as const, icon: "⬡" },
        ]);
      })
      .catch(() => {
        // Fallback to mock data if API fails
        setMetrics(STATS);
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted">
            SaaS service overview — last updated 2 min ago
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" href="/users">
            + Invite User
          </Button>
          <Button variant="primary" href="/api-keys">
            + New API Key
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="admin-card h-28 animate-pulse bg-panel/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(metrics || STATS).map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Activity feed */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Recent Activity</h2>
            <Button variant="ghost" href="/activity">
              View all →
            </Button>
          </div>
          <div className="divide-y divide-hairline/60">
            {ACTIVITIES.slice(0, 6).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 px-5 py-3.5">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    activity.type === "security"
                      ? "bg-threat"
                      : activity.type === "billing"
                        ? "bg-telemetry"
                        : activity.type === "api"
                          ? "bg-cyan"
                          : activity.type === "user"
                            ? "bg-kernel"
                            : "bg-muted"
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">
                    <span className="font-medium">{activity.actor}</span>{" "}
                    <span className="text-muted">{activity.action}</span>{" "}
                    <span className="font-medium text-cyan">{activity.target}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted/60">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Subscriptions summary */}
        <Card>
          <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[15px] font-semibold text-ink">Subscriptions</h2>
            <Button variant="ghost" href="/subscriptions">
              Manage →
            </Button>
          </div>
          <div className="divide-y divide-hairline/60">
            {SUBSCRIPTIONS.slice(0, 5).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-ink">{sub.customer}</p>
                  <p className="font-mono text-[10px] capitalize text-muted">{sub.plan}</p>
                </div>
                <Badge
                  variant={
                    sub.status === "active"
                      ? "kernel"
                      : sub.status === "trialing"
                        ? "cyan"
                        : sub.status === "past_due"
                          ? "threat"
                          : "muted"
                  }
                >
                  {sub.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan/10 text-lg text-cyan" aria-hidden="true">
            ◉
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink">User Management</p>
            <p className="text-[11.5px] text-muted">Manage roles, access, and invitations</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-kernel/10 text-lg text-kernel" aria-hidden="true">
            ▣
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink">Billing & Invoices</p>
            <p className="text-[11.5px] text-muted">Track revenue, invoices, and payments</p>
          </div>
        </Card>
        <Card className="flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-telemetry/10 text-lg text-telemetry" aria-hidden="true">
            ⚿
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink">API Key Management</p>
            <p className="text-[11.5px] text-muted">Create, rotate, and revoke API keys</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
