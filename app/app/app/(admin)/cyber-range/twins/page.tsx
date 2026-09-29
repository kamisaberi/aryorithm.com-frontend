import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function DigitalTwinsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Digital Twins"
        description="Digital twin simulation and infrastructure modeling"
        breadcrumbs={[{ label: "Cyber Range", href: "/cyber-range/twins" }, { label: "Digital Twins" }]}
      />
      <PlaceholderView
        title="Digital Twin Simulation"
        description="Create and manage digital twins of your infrastructure for testing and simulation."
        icon="⧉"
        stats={[
          { label: "Active Twins", value: "12" },
          { label: "Simulations Run", value: "89" },
          { label: "Scenarios", value: "34" },
          { label: "Last Run", value: "1 hour ago" },
        ]}
      />
    </div>
  );
}
