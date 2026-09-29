import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function Nis2DoraPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="NIS2 / DORA"
        description="NIS2 directive and DORA compliance management"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "NIS2 / DORA" }]}
      />
      <PlaceholderView
        title="NIS2 / DORA Compliance"
        description="Track compliance status, manage controls, and generate reports for NIS2 and DORA regulations."
        icon="✓"
        stats={[
          { label: "Controls Met", value: "87%" },
          { label: "Pending Actions", value: "12" },
          { label: "Last Audit", value: "30 days ago" },
          { label: "Next Audit", value: "60 days" },
        ]}
      />
    </div>
  );
}
