"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type MedicalScanner, type PACSEvent } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK_SCANNERS: MedicalScanner[] = [
  { scanner_id: "DICOM-MRI_DEPT1-10.0.1.50", name: "Siemens Magnetom 3T MRI Scanner", ae_title: "MRI_DEPT_01", ip_address: "10.0.1.50", department: "Radiology Suite B", connected_sentinel_node: "NODE-c34b12", status: "SECURE_ACTIVE", unencrypted_hl7_detected: false, last_cstore_timestamp: 1774998240 },
];
const FALLBACK_EVENTS: PACSEvent[] = [];

export default function MedicalPacsPage() {
  const { token } = useAuth();
  const scanners = useBackend<MedicalScanner[]>(FALLBACK_SCANNERS, (t) => backend.medicalScanners(t), token, 20000);
  const events = useBackend<PACSEvent[]>(FALLBACK_EVENTS, (t) => backend.pacsEvents(t), token, 20000);

  const columns = [
    { key: "when", header: "Time", render: (e: PACSEvent) => (
      <span className="font-mono text-[11px] text-muted">{new Date(e.timestamp * 1000).toLocaleTimeString()}</span>
    )},
    { key: "ae", header: "AE Title", render: (e: PACSEvent) => (
      <span className="font-mono text-[11px] text-ink">{e.ae_title}</span>
    )},
    { key: "flow", header: "Flow", render: (e: PACSEvent) => (
      <span className="font-mono text-[11px] text-threat">{e.source_ip} → {e.destination_ip}</span>
    )},
    { key: "anomaly", header: "Anomaly", render: (e: PACSEvent) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{e.anomaly_type}</p>
        {e.mitre_id && <p className="font-mono text-[10px] text-muted">{e.mitre_id}</p>}
      </div>
    )},
    { key: "action", header: "Action", render: (e: PACSEvent) => (
      <span className="font-mono text-[11px] text-kernel">{e.action_enforced} {e.mitigation_latency_us.toFixed(2)}µs</span>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical & IoMT"
        description="Radiology scanner inventory and PACS exfiltration alerts"
        breadcrumbs={[{ label: "Specialized CPS", href: "/threats/medical-pacs" }, { label: "Medical & IoMT" }]}
        actions={<Badge variant={scanners.live ? "kernel" : "muted"}>{scanners.data.length} scanners</Badge>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scanners.data.map((s) => (
          <Card key={s.scanner_id} className="p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] font-bold text-ink">{s.ae_title}</p>
              <Badge variant={s.status === "SECURE_ACTIVE" ? "kernel" : "threat"}>{s.status}</Badge>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">{s.name}</p>
            <p className="mt-2 font-mono text-[10.5px] text-muted">{s.ip_address} · {s.department}</p>
            <p className="mt-1 font-mono text-[10.5px] text-muted">via {s.connected_sentinel_node}{s.unencrypted_hl7_detected ? " · UNENCRYPTED HL7" : ""}</p>
          </Card>
        ))}
      </div>
      <Card>
        <Table columns={columns} data={events.data} keyExtractor={(e) => e.event_id} />
      </Card>
    </div>
  );
}
