import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function InsurancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Insurance Proof"
        description="Cyber insurance documentation and evidence management"
        breadcrumbs={[{ label: "Compliance GRC", href: "/compliance/nis2-dora" }, { label: "Insurance Proof" }]}
      />
      <PlaceholderView
        title="Insurance Proof"
        description="Generate and manage cyber insurance documentation, evidence packages, and compliance proofs."
        icon="▤"
        stats={[
          { label: "Documents", value: "24" },
          { label: "Verified", value: "22" },
          { label: "Pending Review", value: "2" },
          { label: "Last Generated", value: "7 days ago" },
        ]}
      />
    </div>
  );
}
