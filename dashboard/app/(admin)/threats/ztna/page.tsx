"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ZTNASession } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: ZTNASession[] = [
  { user_email: "operator_4@eurogrid.nl", current_risk_score: 0.92, risk_tier: "CRITICAL", risk_factors: ["Impossible travel: Amsterdam -> Singapore in 120s (Velocity: 5,200 km/h)", "Login from non-attested hardware (Zero TPM quote verified)"], active_enclaves_accessed: ["CRITICAL_OT_SUBSTATION_01"], automated_action: "ENCLAVE_ACCESS_QUARANTINED", timestamp: 1774998200 },
];

export default function ZtnaPage() {
  const { token } = useAuth();
  const sessions = useBackend<ZTNASession[]>(FALLBACK, (t) => backend.ztnaSessions(t), token, 20000);

  const columns = [
    { key: "user", header: "User", render: (s: ZTNASession) => (
      <span className="font-mono text-[11px] text-ink">{s.user_email}</span>
    )},
    { key: "risk", header: "Risk", render: (s: ZTNASession) => (
      <div className="flex items-center gap-2">
        <div className="h-2 w-24 overflow-hidden rounded bg-hairline">
          <div className={`h-full rounded ${s.current_risk_score >= 0.8 ? "bg-threat" : s.current_risk_score >= 0.5 ? "bg-telemetry" : "bg-kernel"}`} style={{ width: `${Math.round(s.current_risk_score * 100)}%` }} />
        </div>
        <span className="font-mono text-[11px] text-ink">{s.current_risk_score.toFixed(2)}</span>
        <Badge variant={s.risk_tier === "CRITICAL" ? "threat" : s.risk_tier === "LOW" ? "kernel" : "telemetry"}>{s.risk_tier}</Badge>
      </div>
    )},
    { key: "factors", header: "Risk Factors", render: (s: ZTNASession) => (
      <div className="max-w-md space-y-1">
        {s.risk_factors.length === 0 && <span className="font-mono text-[10.5px] text-muted">—</span>}
        {s.risk_factors.map((f) => (
          <p key={f} className="font-mono text-[10.5px] text-muted">· {f}</p>
        ))}
      </div>
    )},
    { key: "action", header: "Automated Action", render: (s: ZTNASession) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{s.automated_action}</p>
        <p className="font-mono text-[10px] text-muted">{s.active_enclaves_accessed.join(", ") || "—"}</p>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Zero Trust (ZTNA)"
        description="Continuous identity risk scoring with automated quarantine webhooks"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/ztna" }, { label: "Zero Trust (ZTNA)" }]}
        actions={<Badge variant={sessions.live ? "kernel" : "muted"}>{sessions.data.length} sessions</Badge>}
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Quarantine webhook</p>
        <p className="mt-2 font-mono text-[11px] text-muted">POST Intune / Okta revoke when risk ≥ 0.80 · biometric step-up at ≥ 0.50</p>
      </Card>
      <Card>
        <Table columns={columns} data={sessions.data} keyExtractor={(s) => s.user_email} />
      </Card>
    </div>
  );
}
