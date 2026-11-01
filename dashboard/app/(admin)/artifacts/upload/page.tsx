"use client";

import { useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { UploadModal } from "@/components/artifacts/ArtifactsExplorer";
import { useAuth } from "@/lib/auth";
import type { UnifiedArtifactDetail } from "@/lib/backend";

export default function UploadArtifactPage() {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(true);
  const [uploaded, setUploaded] = useState<UnifiedArtifactDetail | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Artifact"
        description="Publish a package, dataset, model, PCAP, scenario, blueprint or appliance directly from your signed-in account — no developer API token required."
        breadcrumbs={[
          { label: "AI & Sentinel-Hub", href: "/hub/store" },
          { label: "Upload Artifact" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button href="/artifacts/mine" variant="secondary">
              My artifacts
            </Button>
            <Button href="/artifacts/shared" variant="secondary">
              Shared with me
            </Button>
          </div>
        }
      />

      {uploaded ? (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-kernel">
                Upload complete
              </p>
              <h2 className="mt-2 font-display text-xl font-bold text-ink">
                {uploaded.name}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {uploaded.asset_type} / {uploaded.slug}
              </p>
            </div>
            <Badge variant={uploaded.visibility === "public" ? "cyan" : "muted"}>
              {uploaded.visibility}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-hairline bg-void/40 p-3.5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                Version
              </p>
              <p className="mt-1 font-display text-[14px] font-bold text-ink">
                {uploaded.version || "—"}
              </p>
            </div>
            <div className="rounded-md border border-hairline bg-void/40 p-3.5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                Signature
              </p>
              <p className="mt-1 font-display text-[14px] font-bold text-kernel">
                {uploaded.verified_signature ? "Verified" : "Recorded"}
              </p>
            </div>
            <div className="rounded-md border border-hairline bg-void/40 p-3.5">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                Owner
              </p>
              <p className="mt-1 truncate font-display text-[14px] font-bold text-ink">
                {uploaded.author || user?.name || "You"}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button href="/artifacts/mine">Open My Artifacts</Button>
            <Link
              href="/hub/explore"
              className="admin-btn-secondary"
            >
              Find in Artifact Hub
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setUploaded(null);
                setOpen(true);
              }}
            >
              Upload another
            </Button>
          </div>

          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            {uploaded.visibility === "public"
              ? "This artifact is live in the public Hub. You can adjust metadata, sharing or visibility from My Artifacts."
              : "This artifact is private to your workspace. Share it with specific members or promote it to the public Hub from My Artifacts."}
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                Session-authenticated intake
              </p>
              <h2 className="mt-2 font-display text-[19px] font-bold text-ink">
                Upload without a developer token.
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Your dashboard login is sufficient. Workspace uploads are signed
                server-side with the deployment key when you do not provide an
                Ed25519 signature, and private visibility is the default.
              </p>
              <ul className="mt-4 grid gap-2 text-[12.5px] text-muted sm:grid-cols-2">
                <li>✓ Packages, datasets, models and PCAPs</li>
                <li>✓ Scenarios, blueprints and appliances</li>
                <li>✓ Private by default; promote only after review</li>
                <li>✓ Share directly with people, tenants or signed links</li>
              </ul>
            </div>
            <Button onClick={() => setOpen(true)}>↑ Start upload</Button>
          </div>
        </Card>
      )}

      {open && (
        <UploadModal
          token={token}
          isSuperAdmin={user?.role === "super_admin"}
          onClose={() => setOpen(false)}
          onUploaded={(detail) => {
            setUploaded(detail);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
