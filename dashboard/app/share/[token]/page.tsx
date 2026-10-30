"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { BACKEND_ORIGIN } from "@/lib/config";
import { backend, type ShareLinkResolution } from "@/lib/backend";

function bytes(value: number): string {
  if (!value) return "—";
  if (value >= 1_073_741_824) return `${(value / 1_073_741_824).toFixed(1)} GB`;
  if (value >= 1_048_576) return `${(value / 1_048_576).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const EXTENSIONS: Record<string, string> = {
  package: ".spkg",
  dataset: ".slab",
  model: ".onnx",
  pcap: ".pcap",
  scenario: ".tar.gz",
  blueprint: ".blueprint",
  appliance: ".aryopack",
};

function artifactFilename(asset: {
  slug: string;
  asset_type: string;
  file_name?: string;
  manifest?: Record<string, unknown>;
}): string {
  if (asset.file_name) return asset.file_name;
  const manifestFile = asset.manifest?.file_name;
  if (typeof manifestFile === "string" && manifestFile) return manifestFile;
  return `${asset.slug}${EXTENSIONS[asset.asset_type] ?? ".bin"}`;
}

export default function ShareLinkPage({
  params,
}: {
  params: { token: string };
}) {
  const [data, setData] = useState<ShareLinkResolution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    backend
      .resolveShareLink(params.token)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "This share link is invalid, expired, revoked or exhausted."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  const downloadHref = data
    ? data.download_url.startsWith("http")
      ? data.download_url
      : `${BACKEND_ORIGIN}${data.download_url}`
    : null;

  return (
    <div className="min-h-screen bg-void">
      <header className="border-b border-hairline bg-panel/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="block h-2.5 w-2.5 bg-cyan"
              style={{ boxShadow: "0 0 12px rgba(0,229,255,0.9)" }}
              aria-hidden="true"
            />
            <span className="font-display text-[15px] font-bold tracking-[0.16em] text-ink">
              ARYORITHM
            </span>
          </Link>
          <Badge variant="cyan">Secure artifact share</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
        {loading ? (
          <Card className="p-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Validating signed share link…
            </p>
          </Card>
        ) : error || !data ? (
          <Card className="p-8 lg:p-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-threat">
              {"// Link unavailable"}
            </p>
            <h1 className="mt-3 font-display text-[28px] font-bold text-ink">
              This share link cannot be opened.
            </h1>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-muted">
              {error ??
                "The link may have expired, been revoked, reached its use limit, or the artifact is no longer available."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button href="/artifacts">Open my workspace</Button>
              <Button variant="secondary" href="https://hub.aryorithm.com/explore">
                Browse public Hub
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">
                {"// Time-bounded forensic access"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{data.asset.asset_type}</Badge>
                <Badge variant="muted">v{data.asset.version || "—"}</Badge>
                <Badge variant="kernel">{data.link.permission}</Badge>
                {data.link.expires_at && (
                  <Badge variant="telemetry">expires {dateLabel(data.link.expires_at)}</Badge>
                )}
              </div>
              <h1 className="mt-3 font-display text-[34px] font-bold leading-tight text-ink lg:text-[42px]">
                {data.asset.name}
              </h1>
              <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-muted">
                {data.asset.description || "No description was published for this artifact."}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  File
                </p>
                <p className="mt-2 truncate font-mono text-[12.5px] text-ink">
                  {artifactFilename(data.asset)}
                </p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {bytes(data.asset.file_size || data.asset.size_bytes)}
                </p>
              </Card>
              <Card className="p-5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Integrity
                </p>
                <p className="mt-2 break-all font-mono text-[10px] leading-relaxed text-kernel">
                  {data.asset.merkle_sha256 || "not published"}
                </p>
              </Card>
              <Card className="p-5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Permissions
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(data.asset.permissions || []).map((permission) => (
                    <Badge key={permission} variant="muted">
                      {permission}
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>

            <Card className="p-5 lg:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-display text-[15px] font-bold text-ink">
                    Signed artifact envelope
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {data.asset.author || "Aryorithm"} ·{" "}
                    {data.asset.verified_signature ? "Ed25519 verified" : "unverified"} ·{" "}
                    {data.asset.downloads.toLocaleString()} downloads
                  </p>
                </div>
                {downloadHref && (
                  <a
                    href={downloadHref}
                    className="rounded-md bg-cyan px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
                  >
                    ↓ Download shared artifact
                  </a>
                )}
              </div>
              <div className="mt-5 rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Share terms
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-muted">
                  This link grants <span className="text-cyan">{data.link.permission}</span>{" "}
                  access and {data.link.max_uses ? `is limited to ${data.link.max_uses} use${data.link.max_uses === 1 ? "" : "s"}` : "has no use limit"}.
                  {data.link.expires_at
                    ? ` It expires on ${dateLabel(data.link.expires_at)}.`
                    : " It does not currently expire."}
                </p>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-panel px-5 py-4">
              <p className="text-[12px] text-muted">
                Need to fork or manage artifacts of your own?
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" href="https://hub.aryorithm.com/explore">
                  Public Hub
                </Button>
                <Button href="/artifacts">Open workspace</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
