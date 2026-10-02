"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type SBOM } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";

const FALLBACK: SBOM = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  components: [],
};

export default function SbomPage() {
  const { token } = useAuth();
  const sbom = useBackend<SBOM>(FALLBACK, (t) => backend.sbom(t), token);

  const columns = [
    {
      key: "name",
      header: "Component",
      render: (c: { name: string; version: string; purl: string }) => (
        <span className="font-mono text-[12px] font-medium text-ink">{c.name}</span>
      ),
    },
    {
      key: "version",
      header: "Version",
      render: (c: { name: string; version: string; purl: string }) => (
        <span className="font-mono text-[12px] text-muted">{c.version}</span>
      ),
    },
    {
      key: "purl",
      header: "Package URL",
      render: (c: { name: string; version: string; purl: string }) => (
        <span className="hidden font-mono text-[10px] text-muted lg:inline">{c.purl}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SBOM Tracker"
        description="CycloneDX software bill of materials for CRA / NIS2 compliance"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/sbom" }, { label: "SBOM" }]}
        actions={<Badge variant={sbom.live ? "kernel" : "muted"}>{sbom.data.bomFormat} {sbom.data.specVersion}</Badge>}
      />
      <Card>
        <Table columns={columns} data={sbom.data.components} keyExtractor={(c) => c.purl} />
      </Card>
    </div>
  );
}
