"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ITDREvent } from "@/lib/backend";
import { useBackend } from "@/hooks/useBackend";
import { useAuth } from "@/lib/auth";

const FALLBACK: ITDREvent[] = [
  { incident_id: "ITDR-4402", timestamp: 1774998240, targeted_user: "svc_sql_admin", attacker_ip: "192.168.1.144", attack_technique: "KERBEROASTING_SPN_SWEEP", mitre_id: "T1558.003 (Steal or Forge Kerberos Tickets)", encryption_type_requested: "RC4_HMAC_MD5", status: "BLOCKED_IN_KERNEL", recommended_action: "Reset service account password and enforce AES-256 Kerberos keys." },
];

export default function ItdrPage() {
  const { token } = useAuth();
  const events = useBackend<ITDREvent[]>(FALLBACK, (t) => backend.itdrEvents(t), token, 20000);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const revoke = async (upn: string) => {
    if (!token || busy) return;
    setBusy(upn);
    setMessage(null);
    try {
      const res = await backend.revokeSession({ user_principal_name: upn, reason: "Operator revocation from ITDR console" }, token);
      setMessage(`${res.status} → ${res.user_principal_name}`);
      events.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(null);
    }
  };

  const columns = [
    { key: "incident", header: "Incident", render: (e: ITDREvent) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{e.incident_id}</p>
        <p className="font-mono text-[10px] text-muted">{new Date(e.timestamp * 1000).toLocaleString()}</p>
      </div>
    )},
    { key: "target", header: "Targeted User", render: (e: ITDREvent) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{e.targeted_user}</p>
        <p className="font-mono text-[10px] text-muted">{e.attacker_ip} · {e.encryption_type_requested}</p>
      </div>
    )},
    { key: "technique", header: "Technique", render: (e: ITDREvent) => (
      <div>
        <p className="font-mono text-[11px] text-ink">{e.attack_technique}</p>
        {e.mitre_id && <p className="font-mono text-[10px] text-muted">{e.mitre_id}</p>}
      </div>
    )},
    { key: "status", header: "Status", render: (e: ITDREvent) => (
      <Badge variant={e.status === "REVOKED" ? "muted" : "kernel"}>{e.status}</Badge>
    )},
    { key: "revoke", header: "", render: (e: ITDREvent) => (
      <button type="button" disabled={busy === e.targeted_user || e.status === "REVOKED"} onClick={() => void revoke(e.targeted_user)} className="font-mono text-[10.5px] text-threat hover:underline disabled:opacity-50">
        {busy === e.targeted_user ? "revoking…" : "1-click revoke"}
      </button>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Identity & ITDR"
        description="Kerberoasting bursts and session revocation"
        breadcrumbs={[{ label: "Threat Defense", href: "/threats/identity-itdr" }, { label: "Identity & ITDR" }]}
        actions={<Badge variant={events.live ? "kernel" : "muted"}>{events.data.length} incidents</Badge>}
      />
      {message && <p className="font-mono text-[11px] text-muted">{message}</p>}
      <Card>
        <Table columns={columns} data={events.data} keyExtractor={(e) => e.incident_id} />
      </Card>
    </div>
  );
}
