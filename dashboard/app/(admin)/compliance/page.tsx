"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type NIS2Status, type CMMCStatus, type IECStatus, type NIS2Mandate } from "@/lib/backend";
import { DUMMY_NIS2, DUMMY_CMMC, DUMMY_IEC } from "@/data/dummy";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

interface ComplianceOverview {
  nis2: NIS2Status;
  cmmc: CMMCStatus;
  iec: IECStatus;
}

const FALLBACK: ComplianceOverview = {
  nis2: DUMMY_NIS2,
  cmmc: DUMMY_CMMC,
  iec: DUMMY_IEC,
};

export default function ComplianceHubPage() {
  const { token } = useAuth();
  const overview = useBackend<ComplianceOverview>(
    FALLBACK,
    (t) =>
      Promise.all([backend.nis2(t), backend.cmmc(t), backend.iec62443(t)]).then(
        ([nis2, cmmc, iec]) => ({ nis2, cmmc, iec })
      ),
    token,
    60000
  );

  const { nis2, cmmc, iec } = overview.data;

  const frameworks: { title: string; href: string; live: string; score: string; description: string }[] = [
    {
      title: "EU NIS2 & DORA",
      href: "/compliance/nis2-dora",
      live: nis2.overall_status,
      score: `${nis2.compliance_score_pct}%`,
      description: "Art. 21 technical & operational measures, DORA financial resilience evidence.",
    },
    {
      title: "CMMC 2.0 / NIST",
      href: "/compliance/cmmc-nist",
      live: cmmc.certified_level,
      score: `${cmmc.score_percentage}%`,
      description: `${cmmc.controls_passed}/${cmmc.controls_evaluated} controls evaluated against NIST SP 800-171.`,
    },
    {
      title: "IEC 62443 Industrial",
      href: "/compliance/iec-62443",
      live: iec.system_integrity,
      score: `${iec.zones_verified} zones`,
      description: "Zone & conduit segmentation SL-C maturity for OT installations.",
    },
    {
      title: "SBOM Tracker",
      href: "/compliance/sbom",
      live: "CycloneDX",
      score: "BOM",
      description: "Software bill of materials with per-component provenance and PURLs.",
    },
    {
      title: "Cyber Insurance",
      href: "/compliance/insurance",
      live: "verifier",
      score: "evidence",
      description: "Attested control posture packaged for underwriter premium discounts.",
    },
  ];

  const mandateColumns = [
    { key: "article", header: "Article", render: (m: NIS2Mandate) => (
      <span className="font-mono text-[11px] text-cyan">{m.article}</span>
    )},
    { key: "title", header: "Mandate", render: (m: NIS2Mandate) => (
      <span className="text-[13px] text-ink">{m.title}</span>
    )},
    { key: "status", header: "Status", render: (m: NIS2Mandate) => (
      <Badge variant={m.status === "PASS" ? "kernel" : "threat"}>{m.status}</Badge>
    )},
    { key: "evidence", header: "Evidence", render: (m: NIS2Mandate) => (
      <span className="text-[12px] text-muted">{m.evidence}</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance & GRC Hub"
        description="All regulatory frameworks, attestations and audit evidence in one place"
        breadcrumbs={[{ label: "Compliance & Admin", href: "/compliance" }, { label: "Compliance & GRC Hub" }]}
        actions={<Badge variant={overview.live ? "kernel" : "muted"}>{overview.live ? "live" : "cached"}</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">NIS2 Score</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{nis2.compliance_score_pct}%</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{nis2.overall_status}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">CMMC Score</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{cmmc.score_percentage}%</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{cmmc.certified_level}</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">IEC 62443 Zones</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">{iec.zones_verified}</p>
          <p className="mt-1 font-mono text-[10px] text-muted">{iec.standard} · {iec.system_integrity}</p>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((fw) => (
          <Link key={fw.href} href={fw.href} className="admin-card block p-5 transition-colors hover:border-cyan/40">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-[13.5px] font-semibold text-ink">{fw.title}</p>
              <Badge variant="kernel">{fw.score}</Badge>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-muted">{fw.description}</p>
            <p className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              <span>{fw.live}</span>
              <span className="text-cyan">open →</span>
            </p>
          </Link>
        ))}
      </div>
      <Card>
        <div className="border-b border-hairline px-5 py-3.5">
          <p className="font-display text-[13px] font-semibold text-ink">NIS2 Statutory Mandates</p>
        </div>
        <Table columns={mandateColumns} data={nis2.statutory_mandates} keyExtractor={(m) => m.article} />
      </Card>
    </div>
  );
}
