"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import Markdown from "@/components/hub/Markdown";
import { HUB_BACKEND_ORIGIN } from "@/lib/api";
import { bytes, compact } from "@/lib/format";
import {
  appliances,
  blueprints,
  hubAssets,
  type ApplianceDetail,
  type BlueprintDetail,
  type HubAssetDetail,
  type HubAssetReadme,
  type HubAssetSla,
} from "@/lib/hub";

type Tab = "overview" | "specs" | "manifest" | "security";
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
}

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview & README" },
  { id: "specs", label: "Specs & Latency SLA" },
  { id: "manifest", label: "Dependencies & Manifest" },
  { id: "security", label: "Security & Provenance" },
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
      if (currentKind === "blueprint") {
        const row = await blueprints.detail(slug);
        const detail = row as BlueprintDetail;
        if (cancelled) return;
        const model: ViewData = {
          kind: "blueprint",
          name: detail.name,
          slug: detail.slug,
          version: detail.version,
          description: detail.description,
          author: detail.author,
          authorPublicKey: detail.author_public_key,
          industry: detail.industry,
          targetProtocol: detail.target_site || "site blueprint",
          targetArchitecture: detail.target_architecture,
          license: "Site blueprint",
          downloads: detail.downloads,
          sizeBytes: detail.file_size_bytes,
          verified: detail.verified_signature,
          publishedAt: detail.published_at,
          latencyDisplay: detail.max_pipeline_latency_us
            ? `< ${detail.max_pipeline_latency_us} µs`
            : "—",
          sha256: detail.sha256,
          downloadUrl: detail.download_url,
          compliance: [],
          manifest: {
            target_site: detail.target_site,
            industry: detail.industry,
            target_architecture: detail.target_architecture,
            primary_interface: detail.primary_interface,
            dependencies: detail.dependencies,
          },
          benchmark: {
            max_pipeline_latency_us: detail.max_pipeline_latency_us,
            primary_interface: detail.primary_interface,
          },
          hardwareBinding: detail.hardware_binding,
          slaGuarantees: detail.sla_guarantees,
          dependencies: detail.dependencies,
          rawDagUrl: detail.raw_dag_url,
        };
        setData(model);
        setReadme(
          `# ${detail.name}\n\n${detail.description || "Signed production-site blueprint."}\n\n` +
            `**Target site:** ${detail.target_site || "—"}\n\n` +
            `**Primary interface:** \`${detail.primary_interface}\`\n\n` +
            `**Architecture:** \`${detail.target_architecture}\``
        );
        blueprints
          .rawDag(slug)
          .then((dag) => {
            if (!cancelled) setRawDag(dag);
          })
          .catch(() => {
            /* Raw DAG is optional */
          });
        return;
      }

      if (currentKind === "appliance") {
        const row = (await appliances.detail(slug)) as ApplianceDetail;
        if (cancelled) return;
        setData({
          kind: "appliance",
          name: row.title,
          slug: row.slug,
          version: row.version,
          description:
            "Official, root-signed .aryopack appliance distribution for air-gapped deployment.",
          author: "Aryorithm Authority",
          authorPublicKey: "",
          industry: row.industry,
          targetProtocol: "appliance image",
          targetArchitecture: row.architecture,
          license: row.license_tier,
          downloads: row.download_count,
          sizeBytes: row.file_size_bytes,
          verified: true,
          publishedAt: row.published_at,
          latencyDisplay: "—",
          sha256: row.sha256_checksum,
          downloadUrl: row.download_url,
          compliance: [],
          manifest: {
            file_name: row.file_name,
            architecture: row.architecture,
            industry: row.industry,
            license_tier: row.license_tier,
            verified_health_checks: row.verified_health_checks,
          },
          benchmark: { verified_health_checks: row.verified_health_checks },
          hardwareBinding: { architecture: row.architecture },
          slaGuarantees: {},
          dependencies: { packages: [], models: [] },
          fileHealth: row.verified_health_checks,
          authoritySignature: row.authority_signature,
        });
        setReadme(
          `# ${row.title}\n\nOfficial signed .aryopack appliance distribution. **File:** \`${row.file_name}\`\n\n` +
            `## Air-gapped bootstrap\n\n1. Transfer the image to the target host using a USB drive.\n2. \`chmod +x ${row.file_name}\`\n3. \`sudo ./${row.file_name}\`\n\n` +
            `The installer verifies the embedded Aryorithm Authority Root signature before making any system changes. No cloud egress is required.`
        );
        return;
      }

      const detail = (await hubAssets.detail(currentKind, slug)) as HubAssetDetail;
      let readmeDoc: HubAssetReadme | null = null;
      let slaDoc: HubAssetSla | null = null;
      [readmeDoc, slaDoc] = await Promise.all([
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
        slaGuarantees: (manifest.sla_guarantees as Record<string, unknown> | undefined) || {},
        dependencies: {
          packages: dependencies.packages || [],
          models: dependencies.models || [],
        },
        rawDagUrl:
          (manifest.raw_dag_url as string | undefined) ||
          (manifest.model_routes_url as string | undefined),
      });
      setReadme(
        readmeDoc?.content_markdown ||
          `# ${detail.name}\n\n${detail.description || "No README was published for this asset."}`
      );
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
                <Badge variant={data.verified ? "kernel" : "telemetry"}>
                  {data.verified ? "Ed25519 Verified" : "Signature unverified"}
                </Badge>
                {data.kind === "appliance" && <Badge variant="kernel">Authority Root</Badge>}
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
      </section>
    </div>
  );
}
