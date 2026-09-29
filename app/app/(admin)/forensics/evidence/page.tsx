import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function EvidencePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence PCAP"
        description="Digital forensics evidence capture and PCAP analysis"
        breadcrumbs={[{ label: "Forensics (DFIR)", href: "/forensics/evidence" }, { label: "Evidence PCAP" }]}
      />
      <PlaceholderView
        title="Evidence PCAP Management"
        description="Capture, store, and analyze PCAP evidence for incident response and forensic investigations."
        icon="◎"
        stats={[
          { label: "PCAP Files", value: "156" },
          { label: "Storage Used", value: "2.4 TB" },
          { label: "Active Cases", value: "4" },
          { label: "Last Capture", value: "2 hours ago" },
        ]}
      />
    </div>
  );
}
