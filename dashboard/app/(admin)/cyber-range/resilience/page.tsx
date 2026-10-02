"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type ResilienceScore } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: ResilienceScore = { mttfi_ms: 38.4, rollback_guard_ms: 120, score: 98.4 };

export default function ResiliencePage() {
  const { token } = useAuth();
  const r = useBackend<ResilienceScore>(FALLBACK, (t) => backend.resilience(t), token, 20000);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resilience Scoring"
        description="Chaos-test results and Mean Time to Fleet Immunity (MTTFI)"
        breadcrumbs={[{ label: "Cyber Range", href: "/cyber-range/resilience" }, { label: "Resilience" }]}
        actions={<Badge variant={r.live ? "kernel" : "muted"}>{r.live ? "Live" : "Cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Resilience Score</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">{r.data.score.toFixed(1)}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">MTTFI</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{r.data.mttfi_ms.toFixed(1)} ms</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Auto-rollback Guard</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{r.data.rollback_guard_ms} ms</p>
        </Card>
      </div>
    </div>
  );
}
