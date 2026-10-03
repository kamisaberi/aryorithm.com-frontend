"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import { backend, type InsuranceProof } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: InsuranceProof = {
  tenant_name: "EuroGrid Energy Group",
  certified_tier: "TIER_A_PLUS",
  insurance_discount_eligibility: true,
  estimated_discount_range_pct: "25% - 38%",
  actuarial_telemetry: {
    total_protected_nodes: 124,
    p50_mitigation_latency_us: 0.84,
    p99_mitigation_latency_us: 0.98,
    tpm2_hardware_root_coverage_pct: 100.0,
    ransomware_lateral_containment_sla_us: 0.84,
    unmitigated_breach_window_sec: 0.0,
  },
  cryptographic_verification_token: "ARY-INS-PROOF-9f8a2b-2026",
  issued_timestamp: 1774998000,
  valid_until_timestamp: 1782774000,
};

export default function InsurancePage() {
  const { token } = useAuth();
  const insurance = useBackend<InsuranceProof>(FALLBACK, (t) => backend.insurance(t), token, 20000);
  const d = insurance.data;
  const t = d.actuarial_telemetry;
  const pillars = [
    ["Physical Attestation", "TPM 2.0 hardware root-of-trust verified", `${t.tpm2_hardware_root_coverage_pct.toFixed(0)}% coverage`],
    ["Line-Rate Mitigation", "< 1µs eBPF drops stop ransomware lateral spread", `p99 ${t.p99_mitigation_latency_us.toFixed(2)}µs`],
    ["100% On-Premise Air-Gap", "Zero data exposure via cloud breach", `${t.unmitigated_breach_window_sec.toFixed(1)}s breach window`],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Verifier"
        description="Cryptographic risk rating for cyber insurance underwriters"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/insurance" }, { label: "Insurance Verifier" }]}
        actions={
          <Badge variant={d.insurance_discount_eligibility ? "kernel" : "muted"}>
            {d.certified_tier.replaceAll("_", " ")} / LOW RESIDUAL RISK
          </Badge>
        }
      />
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Actuarial Premium Discount Estimator</p>
        <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">
          Estimated {d.estimated_discount_range_pct} Reduction on Premiums
        </p>
        <p className="mt-1 text-[12.5px] text-muted">{d.tenant_name} · {d.actuarial_telemetry.total_protected_nodes} protected nodes</p>
      </Card>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {pillars.map(([title, desc, metric]) => (
          <Card key={title} className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{title}</p>
            <p className="mt-2 text-[12.5px] text-muted">{desc}</p>
            <p className="tabular mt-2 font-mono text-[13px] font-bold text-cyan">{metric}</p>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Underwriter Verification Key</p>
        <p className="mt-2 font-mono text-[12px] text-ink">{d.cryptographic_verification_token}</p>
        <p className="mt-1 font-mono text-[10px] text-muted">
          issued {new Date(d.issued_timestamp * 1000).toLocaleDateString()} · valid until {new Date(d.valid_until_timestamp * 1000).toLocaleDateString()}
        </p>
        <p className="mt-2 text-[12px] text-muted">Share this token with your broker (Munich Re, Lloyd&apos;s, AXA XL) to prove low operational risk.</p>
      </Card>
    </div>
  );
}
