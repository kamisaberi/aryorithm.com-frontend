import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

export default function ThreatMapPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Threat Map"
        description="Global threat visualization and real-time attack surface monitoring"
        breadcrumbs={[{ label: "Mission Control", href: "/dashboard" }, { label: "Threat Map" }]}
        actions={<Badge variant="threat">3 Active Threats</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Nodes Online</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-kernel">124</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">eBPF Drops</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">1,482</p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Mean SLA</p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">0.84 µs</p>
        </Card>
      </div>
      <Card className="flex h-96 items-center justify-center">
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">◉</span>
          <p className="mt-3 font-display text-[15px] font-semibold text-ink">Global Threat Map</p>
          <p className="mt-1 text-[12px] text-muted">Interactive topology canvas — coming soon</p>
        </div>
      </Card>
    </div>
  );
}
