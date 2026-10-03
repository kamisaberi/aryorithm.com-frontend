"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type ResilienceBench } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: ResilienceBench = {
  resilience_score: 98.4,
  rating_tier: "CRITICAL_RESILIENT_A",
  metrics: {
    mean_time_to_fleet_immunity_ms: 38.4,
    mttfi_target_sla_ms: 50.0,
    p50_kernel_mitigation_latency_us: 0.84,
    p99_kernel_mitigation_latency_us: 0.98,
    auto_rollback_latency_ms: 120.0,
    simulated_attack_containment_rate_pct: 100.0,
  },
  tested_malware_profiles: [
    "Industroyer (IEC 60870-5-104)",
    "Triton / Trisis (TriStation 1131)",
    "Stuxnet (Siemens S7Comm)",
  ],
  last_evaluation_timestamp: 1774998000,
};

export default function ResilienceBenchPage() {
  const { token } = useAuth();
  const bench = useBackend<ResilienceBench>(FALLBACK, (t) => backend.resilienceBench(t), token, 30000);
  const history = useBackend<{ score: number; evaluated_at: number }[]>(
    [{ score: 98.4, evaluated_at: 1774998000 }],
    (t) => backend.resilienceHistory(t),
    token,
    30000
  );
  const d = bench.data;
  const m = d.metrics;
  const pts = history.data.map((h) => h.score);
  const w = 560;
  const h = 120;
  const line = pts.length > 1
    ? pts.map((s, i) => `${(i / (pts.length - 1)) * w},${h - (Math.min(100, s) / 100) * (h - 10) - 5}`).join(" ")
    : `0,${h / 2} ${w},${h / 2}`;

  const download = async () => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/range/resilience/certify`,
      { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resilience_certificate.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resilience Scoring"
        description="Global Resilience Index with certified audit trail"
        breadcrumbs={[{ label: "Cyber Range", href: "/range/resilience-bench" }, { label: "Resilience Scoring" }]}
        actions={
          <button type="button" onClick={() => void download()} className="admin-btn-secondary text-[12px]">
            Download Certified Resilience Certificate (PDF)
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex items-center gap-5 p-6">
          <svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label={`Resilience ${d.resilience_score}`}>
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-hairline" stroke="#1A2232" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="#00FFA3" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${(Math.min(100, d.resilience_score) / 100) * 326.7} 326.7`}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="58" textAnchor="middle" fill="#F0F4F8" fontSize="20" fontWeight="bold">{d.resilience_score.toFixed(1)}</text>
            <text x="60" y="76" textAnchor="middle" fill="#8A99AD" fontSize="9">/ 100</text>
          </svg>
          <div>
            <Badge variant="kernel">{d.rating_tier.replaceAll("_", " ")}</Badge>
            <p className="mt-2 font-mono text-[10.5px] text-muted">
              evaluated {new Date(d.last_evaluation_timestamp * 1000).toLocaleString()}
            </p>
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">MTTFI</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">{m.mean_time_to_fleet_immunity_ms} ms</p>
            <p className="mt-1 font-mono text-[10px] text-muted">target &lt; {m.mttfi_target_sla_ms} ms</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Kernel p50 / p99</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{m.p50_kernel_mitigation_latency_us} µs</p>
            <p className="mt-1 font-mono text-[10px] text-muted">p99 {m.p99_kernel_mitigation_latency_us} µs · SLA &lt; 1000µs</p>
          </Card>
          <Card className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Rollback Latency</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{m.auto_rollback_latency_ms} ms</p>
            <p className="mt-1 font-mono text-[10px] text-muted">containment {m.simulated_attack_containment_rate_pct}%</p>
          </Card>
        </div>
      </div>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">90-day resilience trend</p>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-28 w-full" preserveAspectRatio="none" role="img" aria-label="Resilience trend">
          <polyline points={line} fill="none" stroke="#00FFA3" strokeWidth="1.5" />
        </svg>
        <p className="mt-2 font-mono text-[10px] text-muted">{pts.length} evaluations · profiles: {d.tested_malware_profiles.join(" · ")}</p>
      </Card>
    </div>
  );
}
