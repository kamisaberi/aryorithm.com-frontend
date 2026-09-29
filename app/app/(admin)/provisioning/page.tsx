import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function ProvisioningPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Provision (ZTP)"
        description="Zero-touch provisioning and edge appliance deployment"
        breadcrumbs={[{ label: "Edge Appliances", href: "/fleet-nodes" }, { label: "Provision (ZTP)" }]}
      />
      <PlaceholderView
        title="Zero-Touch Provisioning"
        description="Deploy and configure edge appliances remotely with automated ZTP workflows."
        icon="⚡"
        stats={[
          { label: "Pending Deployments", value: "3" },
          { label: "Provisioned Today", value: "7" },
          { label: "Success Rate", value: "99.2%" },
          { label: "Avg Deploy Time", value: "4m 32s" },
        ]}
      />
    </div>
  );
}
