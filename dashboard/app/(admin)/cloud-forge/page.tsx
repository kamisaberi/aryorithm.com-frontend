"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type ForgeDataset } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_FORGE } from "@/data/dummy";

export default function CloudForgePage() {
  const { token } = useAuth();
  const datasets = useBackend<ForgeDataset[]>(
    DUMMY_FORGE,
    (t) => backend.forgeDatasets(t),
    token
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const totalSamples = datasets.data.reduce((sum, d) => sum + d.samples, 0);

  const train = async (datasetId: string) => {
    if (!token) {
      setMessage("Sign in to start a training job.");
      return;
    }
    setBusyId(datasetId);
    setMessage(null);
    try {
      const res = await backend.forgeTrain(
        { dataset_id: datasetId, epochs: 50 },
        token
      );
      setMessage(`Job ${res.job_id}: ${res.status}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Training request failed");
    } finally {
      setBusyId(null);
    }
  };

  const columns = [
    {
      key: "dataset",
      header: "Dataset",
      render: (d: ForgeDataset) => (
        <span className="font-mono text-[12px] font-medium text-ink">
          {d.dataset_id}
        </span>
      ),
    },
    {
      key: "samples",
      header: "Samples",
      render: (d: ForgeDataset) => (
        <span className="tabular font-mono text-[12px] text-ink">
          {d.samples.toLocaleString()}
        </span>
      ),
    },
    {
      key: "uncertainty",
      header: "High Uncertainty",
      render: (d: ForgeDataset) => (
        <span className="tabular font-mono text-[12px] text-muted">
          {d.high_uncertainty.toLocaleString()}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (d: ForgeDataset) => (
        <button
          type="button"
          disabled={busyId !== null}
          onClick={() => train(d.dataset_id)}
          className="admin-btn-secondary text-[12px] disabled:opacity-50"
        >
          {busyId === d.dataset_id ? "Training…" : "Train"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cloud Forge"
        description="Cloud infrastructure orchestration and deployment management"
        breadcrumbs={[{ label: "AI & Silicon", href: "/model-hub" }, { label: "Cloud Forge" }]}
        actions={
          <Badge variant={datasets.live ? "kernel" : "muted"}>
            {datasets.live ? "Live" : "Cached"}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Total Samples
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-ink">
            {totalSamples.toLocaleString()}
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Datasets
          </p>
          <p className="tabular mt-2 font-display text-2xl font-bold text-cyan">
            {datasets.data.length}
          </p>
        </Card>
      </div>
      <Card>
        <Table
          columns={columns}
          data={datasets.data}
          keyExtractor={(d) => d.dataset_id}
        />
        {message && (
          <p className="border-t border-hairline px-4 py-3 font-mono text-[11px] text-muted">
            {message}
          </p>
        )}
      </Card>
    </div>
  );
}
