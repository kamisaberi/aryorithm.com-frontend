import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderView from "@/components/ui/PlaceholderView";

export default function AttackReplayPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attack Replay"
        description="Attack scenario replay and incident reconstruction"
        breadcrumbs={[{ label: "Cyber Range", href: "/cyber-range/twins" }, { label: "Attack Replay" }]}
      />
      <PlaceholderView
        title="Attack Replay"
        description="Replay attack scenarios, reconstruct incidents, and validate detection capabilities."
        icon="↻"
        stats={[
          { label: "Scenarios", value: "56" },
          { label: "Replays Today", value: "8" },
          { label: "Detection Rate", value: "94%" },
          { label: "MTTR", value: "4.2 min" },
        ]}
      />
    </div>
  );
}
