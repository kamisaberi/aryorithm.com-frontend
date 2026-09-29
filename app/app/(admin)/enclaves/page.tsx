import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function EnclavesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Enclaves / OT"
        description="Operational technology enclaves and secure segmentation"
        breadcrumbs={[{ label: "Edge Appliances", href: "/fleet-nodes" }, { label: "Enclaves / OT" }]}
      />
      <PlaceholderView
        title="Enclave Management"
        description="Manage OT enclaves, micro-segmentation policies, and secure access zones across your infrastructure."
        icon="◆"
        stats={[
          { label: "Active Enclaves", value: "18" },
          { label: "OT Segments", value: "42" },
          { label: "Policies", value: "156" },
          { label: "Violations", value: "0" },
        ]}
      />
    </div>
  );
}
