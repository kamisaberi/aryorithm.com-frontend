"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Markdown from "@/components/hub/Markdown";
import { HUB_BACKEND_ORIGIN } from "@/lib/api";
import { bytes, compact } from "@/lib/format";
import {
  blueprints,
  hubAssets,
  type HubAssetDetail,
  type HubAssetLineage,
} from "@/lib/hub";
import { dashboardUrl } from "@/lib/session";

type Tab = "overview" | "specs" | "manifest" | "security" | "lineage";
type AssetKind = "package" | "model" | "dataset" | "pcap" | "scenario" | "blueprint" | "appliance";

interface ViewData {
  kind: AssetKind;
  name: string;
  slug: string;
  version: string;
  description: string;
  author: string;
  authorPublicKey: string;
  industry: string;
  targetProtocol: string;
  targetArchitecture: string;
  license: string;
  downloads: number;
  sizeBytes: number;
  verified: boolean;
  publishedAt: string;
  latencyDisplay: string;
  sha256: string;
  downloadUrl: string;
  signatureUrl?: string;
  compliance: string[];
  manifest: Record<string, unknown>;
  benchmark: Record<string, unknown>;
  hardwareBinding: Record<string, unknown>;
  slaGuarantees: Record<string, unknown>;
  dependencies: { packages: string[]; models: string[] };
  rawDagUrl?: string;
  fileHealth?: string;
  authoritySignature?: string;
  visibility: "public" | "private";
  ownerUserId: string | null;
  ownerTenantId: string | null;
  forkedFrom: HubAssetDetail["forked_from"];
  forkCount: number;
  orphanedRoot: boolean;
  permissions: string[];
  fileName?: string;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview & README" },
  { id: "specs", label: "Specs & Latency SLA" },
  { id: "manifest", label: "Dependencies & Manifest" },
  { id: "security", label: "Security & Provenance" },
  { id: "lineage", label: "Fork Lineage" },
];

const TYPE_ALIASES: Record<string, AssetKind> = {
  package: "package",
  packages: "package",
  model: "model",
  models: "model",
  dataset: "dataset",
  datasets: "dataset",
  pcap: "pcap",
  pcaps: "pcap",
  scenario: "scenario",
  scenarios: "scenario",
  blueprint: "blueprint",
  blueprints: "blueprint",
  appliance: "appliance",
  appliances: "appliance",
};

function normalizeKind(raw: string): AssetKind | null {
  return TYPE_ALIASES[raw.toLowerCase()] ?? null;
}

function pretty(value: string): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function absolute(path: string | undefined): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/api/")) return `${HUB_BACKEND_ORIGIN}${path}`;
  return `${HUB_BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function cliFor(kind: AssetKind, slug: string): string {
  if (kind === "blueprint") return `aryo blueprint deploy ${slug}`;
  if (kind === "appliance") return `aryo appliance install ${slug}`;
  return `aryo ${kind} pull ${slug}`;
}

function dateLabel(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-hairline bg-void/40 p-3.5">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="tabular mt-1.5 font-display text-[17px] font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 font-mono text-[10px] text-muted">{hint}</p>}
    </div>
  );
}

function jsonBlock(value: Record<string, unknown> | unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function AssetDetailView({ type, slug }: { type: string; slug: string }) {
  const kind = normalizeKind(type);
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<ViewData | null>(null);
  const [readme, setReadme] = useState("");
  const [rawDag, setRawDag] = useState("");
  const [lineage, setLineage] = useState<HubAssetLineage | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [forking, setForking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setReadme("");
    setRawDag("");

    if (!kind) {
      setError(`Unknown asset type “${type}”.`);
      setLoading(false);
      return;
    }
    const currentKind = kind;

    async function load() {
      const detail = (await hubAssets.detail(currentKind, slug)) as HubAssetDetail;
      const [readmeDoc, slaDoc] = await Promise.all([
        hubAssets.readme(currentKind, slug).catch(() => null),
        hubAssets.sla(currentKind, slug).catch(() => null),
      ]);
      if (cancelled) return;
      const manifest = detail.manifest || {};
      const dependencies = (manifest.dependencies || {}) as {
        packages?: string[];
        models?: string[];
      };
      const arch =
        (manifest.target_architecture as string | undefined) ||
        (manifest.target_arch as string | undefined) ||
        (manifest.architecture as string | undefined) ||
        (manifest.target_hardware as string | undefined) ||
        "universal";
      const rawDagUrl =
        (manifest.raw_dag_url as string | undefined) ||
        (manifest.model_routes_url as string | undefined) ||
        (currentKind === "blueprint"
          ? `/api/v1/hub/blueprints/${encodeURIComponent(slug)}/raw-dag`
          : undefined);
      setData({
        kind: currentKind,
        name: detail.name,
        slug: detail.slug,
        version: detail.version,
        description: detail.description,
        author: detail.author,
        authorPublicKey: detail.author_public_key,
        industry: detail.industry,
        targetProtocol: detail.target_protocol,
        targetArchitecture: String(arch),
        license: detail.tier,
        downloads: detail.downloads,
        sizeBytes: detail.file_size || detail.size_bytes,
        verified: detail.verified_signature,
        publishedAt: detail.published_at,
        latencyDisplay: slaDoc?.latency_display || "—",
        sha256: detail.merkle_sha256 || "",
        downloadUrl: detail.download_url,
        signatureUrl: detail.signature_url,
        compliance: detail.compliance || [],
        manifest,
        benchmark: slaDoc?.benchmark || {},
        hardwareBinding:
          (manifest.hardware_binding as Record<string, unknown> | undefined) || {},
        slaGuarantees:
          (manifest.sla_guarantees as Record<string, unknown> | undefined) || {},
        dependencies: {
          packages: dependencies.packages || [],
          models: dependencies.models || [],
        },
        rawDagUrl,
        fileHealth: String(manifest.verified_health_checks || ""),
        authoritySignature: String(manifest.authority_signature || ""),
        visibility: detail.visibility || "public",
        ownerUserId: detail.owner_user_id,
        ownerTenantId: detail.owner_tenant_id,
        forkedFrom: detail.forked_from,
        forkCount: detail.fork_count || 0,
        orphanedRoot: !!detail.orphaned_root,
        permissions: detail.permissions || [],
        fileName: detail.file_name,
      });
      setReadme(
        readmeDoc?.content_markdown ||
          `# ${detail.name}\n\n${detail.description || "No README was published for this asset."}`
      );
      if (currentKind === "blueprint") {
        blueprints
          .rawDag(slug)
          .then((dag) => {
            if (!cancelled) setRawDag(dag);
          })
          .catch(() => {
            /* Raw DAG is optional */
          });
      }
    }

    load().catch((err: unknown) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "This asset could not be loaded.");
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [kind, slug, type]);

  useEffect(() => {
    if (tab !== "lineage" || !kind) return;
    let cancelled = false;
    setLineageLoading(true);
    hubAssets
      .lineage(kind, slug)
      .then((result) => {
        if (!cancelled) setLineage(result);
      })
      .catch(() => {
        if (!cancelled) setLineage(null);
      })
      .finally(() => {
        if (!cancelled) setLineageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, kind, slug]);

  async function handleFork() {
    if (!kind || !data) return;
    setForking(true);
    setNotice(null);
    setActionError(null);
    try {
      const child = await hubAssets.fork(kind, slug);
      setNotice(
        `Forked into your private workspace as “${child.slug}”. The upstream artifact was not changed.`
      );
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "The fork could not be created. Sign in with a member account and retry."
      );
    } finally {
      setForking(false);
    }
  }

  const downloadHref = useMemo(() => absolute(data?.downloadUrl), [data?.downloadUrl]);
  const signatureHref = useMemo(() => absolute(data?.signatureUrl), [data?.signatureUrl]);
  const rawDagHref = useMemo(() => absolute(data?.rawDagUrl), [data?.rawDagUrl]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
        <div className="rounded-md border border-hairline bg-panel p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading asset provenance…
          </p>
        </div>
      </div>
    );
  }

  if (error || !data || !kind) {
    return (
      <div className="mx-auto max-w-[900px] px-5 pb-20 pt-24 lg:px-8">
        <div className="rounded-md border border-threat/30 bg-threat/5 p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-threat">
            {"// Asset unavailable"}
          </p>
          <h1 className="mt-3 font-display text-[24px] font-bold text-ink">
            Unable to inspect this asset.
          </h1>
          <p className="mt-2 text-[13px] text-muted">{error ?? "Unknown asset."}</p>
          <Link
            href="/explore"
            className="mt-5 inline-flex rounded-md border border-cyan/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:bg-cyan/10"
          >
            ← Back to catalog
          </Link>
        </div>
      </div>
    );
  }

  const manifestForViewer = {
    ...data.manifest,
    __asset_type: data.kind,
    __slug: data.slug,
    __version: data.version,
    __author_public_key: data.authorPublicKey,
    ...(rawDag ? { __raw_dag_yaml: rawDag } : {}),
  };

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
      <nav className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
        <Link href="/explore" className="hover:text-cyan">Catalog</Link>
        <span>/</span>
        <span className="text-cyan">{data.kind}</span>
        <span>/</span>
        <span className="truncate text-ink">{data.slug}</span>
      </nav>

      <section className="relative overflow-hidden rounded-md border border-hairline bg-panel p-6 lg:p-8">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="cyan">{data.kind}</Badge>
                <Badge variant="muted">v{data.version || "—"}</Badge>
                <Badge variant={data.visibility === "public" ? "cyan" : "muted"}>
                  {data.visibility === "public" ? "Public" : "Private"}
                </Badge>
                <Badge variant={data.verified ? "kernel" : "telemetry"}>
                  {data.verified ? "Ed25519 Verified" : "Signature unverified"}
                </Badge>
                {data.kind === "appliance" && <Badge variant="kernel">Authority Root</Badge>}
                {data.forkedFrom && <Badge variant="telemetry">Forked</Badge>}
                {data.orphanedRoot && <Badge variant="threat">Orphaned root</Badge>}
              </div>
              <h1 className="mt-3 font-display text-[30px] font-bold leading-tight text-ink lg:text-[38px]">
                {data.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-muted">
                <span className="text-cyan">{data.slug}</span>
                <CopyButton text={data.slug} label="Copy slug" />
                <span>Published {dateLabel(data.publishedAt)}</span>
                <span>{compact(data.downloads || 0)} downloads</span>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2">
              {downloadHref && (
                <a
                  href={downloadHref}
                  className="rounded-md bg-cyan px-5 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
                >
                  ↓ Download Asset
                </a>
              )}
              {data.permissions.includes("FORK") && (
                <button
                  type="button"
                  onClick={() => void handleFork()}
                  className="rounded-md border border-cyan/50 px-5 py-3 text-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-cyan transition-colors hover:bg-cyan/10 disabled:opacity-50"
                  disabled={forking}
                >
                  {forking ? "Forking…" : "⑂ Fork to workspace"}
                </button>
              )}
              <a
                href={dashboardUrl("/artifacts")}
                className="rounded-md border border-hairline px-5 py-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
              >
                Open workspace ↗
              </a>
              <CopyButton
                text={cliFor(data.kind, data.slug)}
                label="Copy CLI command"
                className="justify-center"
              />
            </div>
          </div>

          <p className="mt-5 max-w-3xl text-[13.5px] leading-relaxed text-muted">
            {data.description || "No public description was published for this asset."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Author"
              value={data.author || "Aryorithm"}
              hint={data.authorPublicKey ? `${data.authorPublicKey.slice(0, 18)}…` : "Authority signed"}
            />
            <Metric
              label="Sector / profile"
              value={pretty(data.industry)}
              hint={data.targetProtocol}
            />
            <Metric
              label="Architecture"
              value={pretty(data.targetArchitecture)}
              hint={data.license ? pretty(data.license) : undefined}
            />
            <Metric
              label="Separation latency SLA"
              value={data.latencyDisplay}
              hint={data.kind === "appliance" ? data.fileHealth : "verified in catalog"}
            />
          </div>

          <div className="mt-5 rounded-md border border-hairline/80 bg-void/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-muted">
                Merkle root · SHA-256
              </span>
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-kernel">
                {data.sha256 || "not published"}
              </code>
              {data.sha256 && <CopyButton text={data.sha256} label="Copy hash" />}
            </div>
          </div>
        </div>
      </section>

      {(notice || actionError || data.forkedFrom) && (
        <div className="mt-4 space-y-2">
          {notice && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-kernel/30 bg-kernel/5 px-4 py-3 text-[12px] text-kernel">
              <span>{notice}</span>
              <a
                href={dashboardUrl("/artifacts")}
                className="font-mono text-[10px] uppercase tracking-[0.1em] underline underline-offset-2"
              >
                Open workspace →
              </a>
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-threat/30 bg-threat/5 px-4 py-3 text-[12px] text-threat">
              {actionError}
            </div>
          )}
          {data.forkedFrom && (
            <div className="rounded-md border border-cyan/30 bg-cyan/5 px-4 py-3 text-[12px] text-cyan">
              Forked from{" "}
              <Link
                href={`/assets/${data.forkedFrom.asset_type}/${data.forkedFrom.slug}`}
                className="underline underline-offset-2"
              >
                {data.forkedFrom.asset_type}/{data.forkedFrom.slug}
              </Link>
              {data.forkedFrom.version ? `:v${data.forkedFrom.version}` : ""}. This copy is privately
              owned and never mutates its upstream parent.
            </div>
          )}
        </div>
      )}

      <div className="mt-6 overflow-x-auto border-b border-hairline">
        <div className="flex min-w-max gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] transition-colors ${
                tab === t.id
                  ? "border-cyan text-cyan"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-md border border-hairline bg-panel p-5 lg:p-6">
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="min-w-0">
              <Markdown source={readme} />
            </div>
            <aside className="space-y-3">
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Install / deploy
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-kernel">
                  {cliFor(data.kind, data.slug)}
                </code>
                <CopyButton text={cliFor(data.kind, data.slug)} label="Copy command" className="mt-3" />
              </div>
              {data.kind === "appliance" && (
                <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-kernel">
                    Air-gapped bootstrap
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12px] leading-relaxed text-muted">
                    <li>Transfer the image by USB to the host.</li>
                    <li><code className="text-kernel">chmod +x {data.slug}.aryopack</code></li>
                    <li><code className="text-kernel">sudo ./{data.slug}.aryopack</code></li>
                  </ol>
                  <p className="mt-3 font-mono text-[10px] text-muted">
                    {data.fileHealth} automated checks verified · $0.00 cloud egress
                  </p>
                </div>
              )}
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Your access
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.permissions.length === 0 ? (
                    <span className="text-[12px] text-muted">View only</span>
                  ) : (
                    data.permissions.map((permission) => (
                      <Badge key={permission} variant={permission === "ADMIN" ? "kernel" : "muted"}>
                        {permission}
                      </Badge>
                    ))
                  )}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted">
                  {data.visibility === "public"
                    ? "Public artifact — authenticated members can fork and deploy."
                    : data.ownerUserId
                      ? "Private artifact owned by a member workspace."
                      : "Private tenant artifact — access is restricted to grants."}
                </p>
              </div>
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  File size
                </p>
                <p className="tabular mt-1 font-mono text-[13px] text-ink">{bytes(data.sizeBytes)}</p>
              </div>
            </aside>
          </div>
        )}

        {tab === "specs" && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Worst-case execution"
                value={data.latencyDisplay}
                hint="guaranteed pipeline SLA"
              />
              <Metric
                label="Primary interface"
                value={String(data.hardwareBinding.primary_interface || data.benchmark.primary_interface || data.targetProtocol || "—")}
                hint="NIC / protocol binding"
              />
              <Metric
                label="CPU affinity"
                value={String(data.hardwareBinding.cpu_affinity || data.hardwareBinding.cpu_cores || "auto")}
                hint={String(data.hardwareBinding.rss_queues ? `${data.hardwareBinding.rss_queues} RSS queues` : "RSS queue pinning")}
              />
              <Metric
                label="License"
                value={pretty(data.license)}
                hint={data.kind === "appliance" ? "official distribution" : "published tier"}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Hardware binding
                </p>
                <pre className="code-fade mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-ink">
                  {jsonBlock(data.hardwareBinding)}
                </pre>
              </div>
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  SLA guarantees
                </p>
                <pre className="code-fade mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-ink">
                  {jsonBlock(data.slaGuarantees)}
                </pre>
              </div>
            </div>
            {data.compliance.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Compliance mappings
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.compliance.map((tag) => (
                    <Badge key={tag} variant="cyan">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "manifest" && (
          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Dependency tree
                </p>
                <div className="mt-2 space-y-2">
                  {data.dependencies.packages.length === 0 && data.dependencies.models.length === 0 && (
                    <p className="rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[11px] text-muted">
                      No external dependencies declared.
                    </p>
                  )}
                  {data.dependencies.packages.map((dep) => (
                    <Link
                      key={dep}
                      href={`/assets/package/${dep}`}
                      className="block rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[11px] text-cyan hover:border-cyan/40"
                    >
                      ◈ {dep}
                    </Link>
                  ))}
                  {data.dependencies.models.map((dep) => (
                    <Link
                      key={dep}
                      href={`/assets/model/${dep}`}
                      className="block rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[11px] text-cyan hover:border-cyan/40"
                    >
                      ⬡ {dep}
                    </Link>
                  ))}
                </div>
              </div>
              {rawDagHref && (
                <a
                  href={rawDagHref}
                  className="block rounded-md border border-cyan/40 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:bg-cyan/10"
                >
                  ↓ Download raw model_routes.yaml
                </a>
              )}
            </aside>
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Raw manifest / inspection envelope
                </p>
                <CopyButton text={jsonBlock(manifestForViewer)} label="Copy JSON" />
              </div>
              <pre className="code-fade mt-3 max-h-[560px] overflow-auto rounded-md border border-hairline bg-void p-4 font-mono text-[11px] leading-[1.7] text-ink">
                {jsonBlock(manifestForViewer)}
              </pre>
            </div>
          </div>
        )}

        {tab === "security" && (
          <div className="space-y-5">
            <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={data.verified ? "kernel" : "threat"}>
                  {data.verified ? "Ed25519 VALID" : "UNVERIFIED"}
                </Badge>
                <span className="font-mono text-[11px] text-muted">
                  {data.kind === "appliance"
                    ? "Signed by the Aryorithm Authority Root Key"
                    : "Verifies against the author's enrolled public key"}
                </span>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Signer public key
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-ink">
                  {data.authorPublicKey || "Aryorithm Authority Root Key"}
                </code>
                {data.authorPublicKey && (
                  <CopyButton text={data.authorPublicKey} label="Copy public key" className="mt-3" />
                )}
              </div>
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Artifact signature
                </p>
                <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-ink">
                  {data.authoritySignature || "Inspect the X-Signature-Ed25519 response header on download."}
                </code>
                <div className="mt-3 flex flex-wrap gap-2">
                  {signatureHref && (
                    <a
                      href={signatureHref}
                      className="rounded-md border border-cyan/40 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10"
                    >
                      ↓ Download .sig
                    </a>
                  )}
                  {data.sha256 && (
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        void navigator.clipboard?.writeText(data.sha256);
                      }}
                      className="rounded-md border border-hairline px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
                    >
                      Copy SHA-256
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-hairline bg-void/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Offline verification
              </p>
              <pre className="code-fade mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-kernel">
{`# 1. Hash the downloaded artifact
sha256sum ${data.slug}.${data.kind === "appliance" ? "aryopack" : data.kind === "blueprint" ? "blueprint" : "spkg"}

# 2. Verify the detached Ed25519 signature against the enrolled key
aryo verify --artifact <file> --signature <file>.sig --public-key <key>

# Compare SHA-256 against the Merkle root shown on this page:
${data.sha256}`}
              </pre>
            </div>
            {data.kind === "blueprint" && (
              <div className="rounded-md border border-hairline bg-void/40 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Raw DAG source {rawDag ? "· loaded" : "· not available"}
                </p>
                <pre className="code-fade mt-3 max-h-[360px] overflow-auto font-mono text-[11px] leading-relaxed text-ink">
                  {rawDag || "The raw DAG is not published for this blueprint."}
                </pre>
              </div>
            )}
          </div>
        )}

        {tab === "lineage" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-void/40 px-4 py-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Fork lineage
                </p>
                <p className="mt-1 text-[12.5px] text-ink">
                  {data.name}{" "}
                  <span className="font-mono text-[10px] text-muted">
                    {data.kind}/{data.slug}
                  </span>
                </p>
              </div>
              <Badge variant="muted">
                {data.forkCount} downstream fork{data.forkCount === 1 ? "" : "s"}
              </Badge>
            </div>

            {lineageLoading ? (
              <p className="py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
                Walking fork lineage…
              </p>
            ) : !lineage ? (
              <p className="rounded-md border border-hairline bg-void/40 px-4 py-3 text-[12px] text-muted">
                Lineage is unavailable for this artifact.
              </p>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Upstream ancestry
                  </p>
                  <div className="mt-2 space-y-2">
                    {lineage.ancestors.length === 0 ? (
                      <p className="rounded-md border border-hairline bg-void/40 px-4 py-3 text-[12px] text-muted">
                        This is a root artifact. It has no upstream parent.
                      </p>
                    ) : (
                      lineage.ancestors.map((item) => (
                        <Link
                          key={`${item.asset_type}-${item.slug}`}
                          href={`/assets/${item.asset_type}/${item.slug}`}
                          className="flex items-center gap-2 rounded-md border border-hairline bg-void/40 px-4 py-3 transition-colors hover:border-cyan/40"
                        >
                          <span className="font-mono text-[11px] text-cyan">↑</span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                            {item.name || item.slug}
                          </span>
                          <span className="font-mono text-[9.5px] text-muted">
                            {item.asset_type}/{item.slug}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Downstream forks
                  </p>
                  <div className="mt-2 space-y-2">
                    {lineage.children.length === 0 ? (
                      <p className="rounded-md border border-hairline bg-void/40 px-4 py-3 text-[12px] text-muted">
                        No one has forked this artifact yet.
                      </p>
                    ) : (
                      lineage.children.map((item) => (
                        <Link
                          key={`${item.asset_type}-${item.slug}`}
                          href={`/assets/${item.asset_type}/${item.slug}`}
                          className="flex items-center gap-2 rounded-md border border-hairline bg-void/40 px-4 py-3 transition-colors hover:border-cyan/40"
                        >
                          <span className="font-mono text-[11px] text-cyan">↓</span>
                          <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                            {item.name || item.slug}
                          </span>
                          <Badge variant={item.visibility === "public" ? "cyan" : "muted"}>
                            {item.visibility || "unknown"}
                          </Badge>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-md border border-hairline bg-void/40 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                Fork contract
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                Forks inherit the parent manifest, README and immutable bytes at fork time. A fork
                becomes an independent private artifact in the destination workspace; deleting or
                editing it never modifies this parent. If this root is deleted while forks exist,
                the bytes remain available to descendants and the root is marked{" "}
                <span className="font-mono text-threat">orphaned_root</span>.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
