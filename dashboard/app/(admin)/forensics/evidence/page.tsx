"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type PCAP } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_PCAPS } from "@/data/dummy";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function truncateHash(hash: string): string {
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 12)}…${hash.slice(-6)}`;
}

export default function EvidencePage() {
  const { token } = useAuth();
  const { data: pcaps, live } = useBackend<PCAP[]>(
    DUMMY_PCAPS,
    (t) => backend.pcaps(t),
    token
  );
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadPcap = async (id: string): Promise<void> => {
    setError(null);
    setDownloading(id);
    try {
      const res = await fetch(`${API_BASE}/dfir/pcaps/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        throw new Error(`Download failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}.pcap`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setDownloading(null);
    }
  };

  const columns = [
    {
      key: "pcap_id",
      header: "PCAP ID",
      render: (p: PCAP) => (
        <span className="font-mono text-[12px] font-medium text-ink">
          {p.pcap_id}
        </span>
      ),
    },
    {
      key: "sha256",
      header: "SHA-256",
      render: (p: PCAP) => (
        <span className="font-mono text-[11px] text-muted" title={p.sha256}>
          {truncateHash(p.sha256)}
        </span>
      ),
    },
    {
      key: "size",
      header: "Size",
      render: (p: PCAP) => (
        <span className="tabular font-mono text-[12px] text-ink">
          {(p.size_bytes / 1024).toFixed(1)} KB
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (p: PCAP) => (
        <button
          type="button"
          className="admin-btn-secondary"
          disabled={downloading === p.pcap_id}
          onClick={() => void downloadPcap(p.pcap_id)}
        >
          {downloading === p.pcap_id ? "Downloading…" : "Download"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence PCAP"
        description="Digital forensics evidence capture and PCAP analysis"
        breadcrumbs={[{ label: "Forensics (DFIR)", href: "/forensics/evidence" }, { label: "Evidence PCAP" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {pcaps.length} Files{live ? "" : " (cached)"}
          </Badge>
        }
      />
      <Card>
        <Table columns={columns} data={pcaps} keyExtractor={(p) => p.pcap_id} />
      </Card>
      {error && <p className="font-mono text-[12px] text-threat">{error}</p>}
    </div>
  );
}
