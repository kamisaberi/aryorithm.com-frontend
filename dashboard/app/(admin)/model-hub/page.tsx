import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function ModelHubPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Model Hub (OTA)"
        description="AI model registry, OTA updates, and version management"
        breadcrumbs={[{ label: "AI & Silicon", href: "/model-hub" }, { label: "Model Hub (OTA)" }]}
      />
      <PlaceholderView
        title="Model Hub — OTA Updates"
        description="Manage AI model versions, deploy OTA updates, and monitor model performance across the fleet."
        icon="⬡"
        stats={[
          { label: "Active Models", value: "8" },
          { label: "Fleet Coverage", value: "94%" },
          { label: "Pending Updates", value: "3" },
          { label: "Model Version", value: "v2.4" },
        ]}
      />
    </div>
  );
}
