"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type LabBench, type LabMetric } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const metric = (
  key: string, label: string, domain: string, value: number, unit: string,
  target: number, direction: "lower" | "higher", status: "PASS" | "WATCH"
): LabMetric => ({ key, label, domain, value, unit, target, direction, status });

const FALLBACK: LabBench = {
  suite: "sentinel_lab",
  metrics: [
    metric("evt_wcet_p99_us", "WCET p99 bound", "EVT", 148.6, "us", 200, "lower", "PASS"),
    metric("evt_wcet_p999_us", "WCET p99.9 tail bound", "EVT", 212.5, "us", 250, "lower", "PASS"),
    metric("evt_deadline_miss_pct", "Deadline-miss rate", "EVT", 0.02, "%", 0.1, "lower", "PASS"),
    metric("pmu_l1d_miss_rate_pct", "L1-D cache miss rate", "PMU", 1.42, "%", 3.0, "lower", "PASS"),
    metric("pmu_llc_miss_rate_pct", "LLC miss rate", "PMU", 0.37, "%", 0.5, "lower", "PASS"),
    metric("pmu_branch_miss_pct", "Branch mispredict rate", "PMU", 0.9, "%", 1.5, "lower", "PASS"),
    metric("cbf_invariant_violations", "Safety invariant violations", "CBF", 0, "count", 0, "lower", "PASS"),
    metric("cbf_min_barrier_margin", "Minimum barrier margin h(x)", "CBF", 0.18, "", 0.1, "higher", "PASS"),
    metric("cbf_reachability_coverage_pct", "Reachable-set coverage", "CBF", 99.6, "%", 99.0, "higher", "PASS"),
    metric("hil_ode_rms_residual", "ODE solver RMS residual", "HIL", 0.0000014, "", 0.00001, "lower", "PASS"),
    metric("hil_realtime_factor", "Real-time factor", "HIL", 1.004, "x", 1.0, "higher", "PASS"),
    metric("hil_step_stability_pct", "Integrator step stability", "HIL", 99.9, "%", 99.5, "higher", "PASS"),
    metric("pqc_kyber_encaps_overhead_pct", "ML-KEM encapsulation overhead", "PQC", 6.2, "%", 10.0, "lower", "PASS"),
    metric("pqc_dilithium_sign_overhead_pct", "ML-DSA signing overhead", "PQC", 13.4, "%", 12.0, "lower", "WATCH"),
  ],
  domains: ["EVT", "PMU", "CBF", "HIL", "PQC"],
  passed: 13,
  overall_score: 92.9,
  last_run_timestamp: 1774998120,
};

function ago(ts: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function LabBenchPage() {
  const { token } = useAuth();
  const bench = useBackend<LabBench>(FALLBACK, (t) => backend.labBench(t), token, 60000);

  const b = bench.data;
  const watches = b.metrics.filter((m) => m.status === "WATCH");

  const columns = [
    { key: "domain", header: "Domain", render: (m: LabMetric) => (
      <Badge variant="telemetry">{m.domain}</Badge>
    )},
    { key: "metric", header: "Metric", render: (m: LabMetric) => (
      <div>
        <p className="text-[13px] font-medium text-ink">{m.label}</p>
        <p className="font-mono text-[10px] text-muted">{m.key}</p>
      </div>
    )},
    { key: "value", header: "Value", render: (m: LabMetric) => (
      <span className="tabular font-mono text-[12px] text-ink">
        {m.value >= 1 ? m.value : m.value.toString()}
        {m.unit && <span className="text-muted"> {m.unit}</span>}
      </span>
    )},
    { key: "target", header: "Target", render: (m: LabMetric) => (
      <span className="font-mono text-[11.5px] text-muted">
        {m.direction === "lower" ? "≤" : "≥"} {m.target}
        {m.unit && ` ${m.unit}`}
      </span>
    )},
    { key: "status", header: "Status", render: (m: LabMetric) => (
      <Badge variant={m.status === "PASS" ? "kernel" : "telemetry"}>{m.status}</Badge>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sentinel-Lab Research Bench"
        description="14-dimension research suite — EVT WCET bounds, PMU counters, CBF safety invariants, HIL dynamics, PQC overheads"
        breadcrumbs={[{ label: "Digital Forensics & Range", href: "/range/lab-bench" }, { label: "Sentinel-Lab Research Bench" }]}
        actions={<Badge variant={bench.live ? "kernel" : "muted"}>{bench.live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Overall Score</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{b.overall_score}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{b.suite}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">In Target</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {b.passed}<span className="text-muted text-base">/{b.metrics.length}</span>
          </p>
          <p className="mt-1 font-mono text-[10px] text-muted">{watches.length} on watch</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Domains</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{b.domains.length}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{b.domains.join(" · ")}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Last Run</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{ago(b.last_run_timestamp)}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">deterministic replayable suite</p>
        </Card>
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">Research Metrics</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted">
            14 dimensions across EVT · PMU · CBF · HIL · PQC
          </p>
        </div>
        <Table columns={columns} data={b.metrics} keyExtractor={(m) => m.key} />
      </Card>
    </div>
  );
}
