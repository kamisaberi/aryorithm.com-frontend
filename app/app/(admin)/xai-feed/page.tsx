import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";

const feedItems = [
  { id: 1, type: "anomaly", message: "Anomalous traffic pattern detected on node EU-WEST-04", severity: "high", time: "2 min ago" },
  { id: 2, type: "model", message: "XAI model v2.4 canary deployed to 12% of fleet", severity: "info", time: "15 min ago" },
  { id: 3, type: "threat", message: "Lateral movement attempt blocked — SCADA segment", severity: "critical", time: "32 min ago" },
  { id: 4, type: "model", message: "Model drift detected — retraining scheduled", severity: "medium", time: "1 hour ago" },
  { id: 5, type: "anomaly", message: "Unusual API key usage pattern — Partner: Sentinel", severity: "medium", time: "2 hours ago" },
];

export default function XAIFeedPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live XAI Feed"
        description="Real-time explainable AI predictions and model inference stream"
        breadcrumbs={[{ label: "Mission Control", href: "/dashboard" }, { label: "Live XAI Feed" }]}
        actions={<Badge variant="kernel">Streaming</Badge>}
      />
      <Card>
        <div className="divide-y divide-hairline/60">
          {feedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-4 px-5 py-4">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  item.severity === "critical" ? "bg-threat" :
                  item.severity === "high" ? "bg-telemetry" :
                  item.severity === "medium" ? "bg-cyan" : "bg-kernel"
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-ink">{item.message}</p>
                <div className="mt-1 flex items-center gap-3">
                  <Badge variant={
                    item.severity === "critical" ? "threat" :
                    item.severity === "high" ? "telemetry" :
                    item.severity === "medium" ? "cyan" : "kernel"
                  }>{item.type}</Badge>
                  <span className="font-mono text-[10px] text-muted/60">{item.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
