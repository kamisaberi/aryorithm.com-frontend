"use client";

import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { DUMMY_XAI } from "@/data/dummy";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";
import { backend } from "@/lib/backend";

type Severity = "threat" | "telemetry" | "cyan" | "kernel";

function severityOf(index: number, mitreId: string | null): Severity {
  if (!mitreId) return "kernel";
  if (index === 0) return "threat";
  if (index === 1) return "telemetry";
  return "cyan";
}

const dotStyles: Record<Severity, string> = {
  threat: "bg-threat",
  telemetry: "bg-telemetry",
  cyan: "bg-cyan",
  kernel: "bg-kernel",
};

export default function XAIFeedPage() {
  const { token } = useAuth();
  const { data: items, live } = useBackend(DUMMY_XAI, (t) => backend.xaiRecent(t), token);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live XAI Feed"
        description="Real-time explainable AI predictions and model inference stream"
        breadcrumbs={[{ label: "Mission Control", href: "/dashboard" }, { label: "Live XAI Feed" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            Streaming{live ? "" : " (cached)"}
          </Badge>
        }
      />
      <Card>
        <div className="divide-y divide-hairline/60">
          {items.map((item, i) => {
            const severity = severityOf(i, item.mitre_id);
            return (
              <div key={`${item.attacker_ip}-${i}`} className="flex items-start gap-4 px-5 py-4">
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotStyles[severity]}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-ink">
                    Blocked intrusion from <span className="font-mono">{item.attacker_ip}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={severity}>{item.mitre_id ? "threat" : "anomaly"}</Badge>
                    {item.mitre_id && <Badge variant="cyan">{item.mitre_id}</Badge>}
                    {item.attributions.map((a) => (
                      <span
                        key={a.feature}
                        className="rounded border border-hairline bg-panel px-1.5 py-0.5 font-mono text-[10px] text-muted"
                      >
                        {a.feature}:{a.pct.toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
