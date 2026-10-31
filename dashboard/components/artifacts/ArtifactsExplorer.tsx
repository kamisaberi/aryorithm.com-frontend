"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import {
  backend,
  type ArtifactLineage,
  type ArtifactShare,
  type ArtifactShareLink,
  type ArtifactType,
  type ArtifactVisibility,
  type UnifiedArtifact,
  type UnifiedArtifactDetail,
  type WorkspaceArtifactQuery,
} from "@/lib/backend";

type Scope = NonNullable<WorkspaceArtifactQuery["scope"]>;
type DetailTab = "overview" | "lineage" | "sharing";
type ShareGrantee = "user" | "tenant" | "email";
type SharePermission = "VIEW" | "FORK" | "DEPLOY" | "ADMIN";

const TYPES: {
  id: ArtifactType;
  label: string;
  short: string;
  icon: string;
  extension: string;
}[] = [
  { id: "package", label: "Packages", short: "SPKG", icon: "◈", extension: ".spkg" },
  { id: "dataset", label: "Datasets", short: "SLAB", icon: "▤", extension: ".slab" },
  { id: "model", label: "Models", short: "ONNX", icon: "⬡", extension: ".onnx" },
  { id: "pcap", label: "PCAPs", short: "PCAP", icon: "⇄", extension: ".pcap" },
  { id: "scenario", label: "Scenarios", short: "RANGE", icon: "⬣", extension: ".tar.gz" },
  { id: "blueprint", label: "Blueprints", short: "DAG", icon: "⌗", extension: ".blueprint" },
  { id: "appliance", label: "Appliances", short: "ARYOPACK", icon: "▣", extension: ".aryopack" },
];

const TYPE_BY_ID = new Map(TYPES.map((item) => [item.id, item]));

const SCOPES: { id: Scope; label: string; hint: string }[] = [
  { id: "private", label: "My Workspace", hint: "Tenant-owned private assets" },
  { id: "shared", label: "Shared with Me", hint: "Explicit user / tenant grants" },
  { id: "public", label: "Public Hub", hint: "Published marketplace assets" },
  { id: "all", label: "All Visible", hint: "Everything you can access" },
];

const PERMISSIONS: { id: SharePermission; label: string; hint: string }[] = [
  { id: "VIEW", label: "Viewer", hint: "Inspect metadata and download" },
  { id: "FORK", label: "Forker", hint: "Clone into a private workspace" },
  { id: "DEPLOY", label: "Edge Deployer", hint: "Push to sentinel-nexus" },
  { id: "ADMIN", label: "Admin", hint: "Edit metadata and sharing" },
];

function pretty(value: string | null | undefined): string {
  if (!value) return "—";
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const issues = err.details?.issues;
    if (Array.isArray(issues) && issues.length > 0) {
      return `${err.message}: ${issues.join("; ")}`;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : "The request could not be completed.";
}

function defaultTemplate(type: ArtifactType, slug: string): Record<string, unknown> {
  const base = {
    slug,
    name: "New artifact",
    version: "1.0.0",
    short_description: "Describe this artifact.",
    technical_details: "Technical notes for operators.",
    compliance: [] as string[],
  };
  switch (type) {
    case "package":
      return {
        ...base,
        tier: "lua",
        sector: "energy",
        target_protocol: "MODBUS_TCP",
        default_port: 502,
        latency_sla_ns: 840,
        mitigation_action: "In-kernel packet drop",
      };
    case "dataset":
      return {
        ...base,
        format: "PARQUET_COMPACT",
        tensor_dimension: 128,
        total_records: 100000,
        source_benchmark: "Private corpus",
      };
    case "model":
      return {
        ...base,
        format: "ONNX",
        precision: "INT8",
        tier: "COMMUNITY",
        domain: "ot-security",
        architecture: "transformer",
        target_hardware: "x86_64",
      };
    case "pcap":
      return {
        slug,
        title: "New capture",
        category: "SCADA_ICS",
        target_protocol: "MODBUS_TCP",
        attack_type: "RECON",
        source_origin: "PRIVATE_LAB",
        short_description: "Capture description.",
        technical_analysis: "Observed behavior.",
      };
    case "scenario":
      return {
        ...base,
        complexity: "INTERMEDIATE",
        target_sector: "water",
        node_topology: { nodes: [] },
        replayed_attacks: [],
      };
    case "blueprint":
      return {
        slug,
        name: "New production blueprint",
        version: "1.0.0",
        description: "Hardware-bound production deployment plan.",
        industry: "water",
        target_architecture: "x86_64",
        primary_interface: "ens160",
        raw_dag_yaml: "routes:\n  - id: capture\n    model: aryo-netflow-mae-v2\n",
      };
    case "appliance":
      return {
        slug,
        title: "New appliance image",
        version: "1.0.0",
        architecture: "x86_64-openvino",
        industry: "water",
        license_tier: "enterprise",
        verified_health_checks: "21/21",
      };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function artifactFilename(item: { slug: string; asset_type: string; file_name?: string }) {
  if (item.file_name) return item.file_name;
  const ext = TYPE_BY_ID.get(item.asset_type as ArtifactType)?.extension ?? ".bin";
  return `${item.slug}${ext}`;
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-void/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`my-4 w-full rounded-lg border border-hairline bg-panel shadow-2xl shadow-black/60 ${
          wide ? "max-w-6xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
          <div>
            <p className="font-display text-[16px] font-bold text-ink">{title}</p>
            {subtitle && <p className="mt-1 text-[12px] text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded border border-hairline px-2 py-1 font-mono text-[12px] text-muted hover:border-cyan/40 hover:text-cyan"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted/80">{hint}</span>}
    </label>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-md border border-hairline bg-void px-3 py-2 text-[12.5px] text-ink placeholder:text-muted/50 focus:border-cyan/60 focus:outline-none";

const HUB_SCOPE_ORDER: Scope[] = ["all", "public", "private", "shared"];

interface ArtifactsExplorerProps {
  /** Initial discovery scope. Workspace defaults to private; Hub discovery defaults to all. */
  initialScope?: Scope;
  /** Hub-style discovery framing while keeping the full workspace action set. */
  hubMode?: boolean;
}

export default function ArtifactsExplorer({
  initialScope = "private",
  hubMode = false,
}: ArtifactsExplorerProps) {
  const { token, user } = useAuth();
  const [scope, setScope] = useState<Scope>(initialScope);
  const [kind, setKind] = useState<ArtifactType | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<{
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    results: UnifiedArtifact[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<UnifiedArtifactDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [lineage, setLineage] = useState<ArtifactLineage | null>(null);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [shares, setShares] = useState<ArtifactShare[]>([]);
  const [shareLinks, setShareLinks] = useState<ArtifactShareLink[]>([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [forkOpen, setForkOpen] = useState(false);
  const [forkSlug, setForkSlug] = useState("");

  const refreshList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await backend.workspaceArtifacts(token, {
        scope,
        type: kind,
        q: query.trim() || undefined,
        page,
        limit: 12,
        sort: "latest",
      });
      setPageData(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [token, scope, kind, query, page]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    setPage(1);
  }, [scope, kind, query]);

  const openDetail = useCallback(
    async (assetType: string, slug: string) => {
      if (!token) return;
      setDetailLoading(true);
      setActionError(null);
      setNotice(null);
      setDetailTab("overview");
      setLineage(null);
      try {
        const detail = await backend.workspaceArtifact(token, assetType, slug);
        setSelected(detail);
        setForkSlug(`${detail.slug}-fork`);
      } catch (err) {
        setActionError(errorMessage(err));
      } finally {
        setDetailLoading(false);
      }
    },
    [token]
  );

  const loadLineage = useCallback(async () => {
    if (!token || !selected) return;
    setLineageLoading(true);
    try {
      setLineage(
        await backend.artifactLineage(token, selected.asset_type, selected.slug)
      );
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setLineageLoading(false);
    }
  }, [token, selected]);

  const loadSharing = useCallback(async () => {
    if (!token || !selected) return;
    setSharingLoading(true);
    try {
      const [shareData, linkData] = await Promise.all([
        backend.artifactShares(token, selected.asset_type, selected.slug),
        backend.artifactShareLinks(token, selected.asset_type, selected.slug),
      ]);
      setShares(shareData.results);
      setShareLinks(linkData.results);
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSharingLoading(false);
    }
  }, [token, selected]);

  useEffect(() => {
    if (!selected) return;
    if (detailTab === "lineage" && !lineage) void loadLineage();
    if (detailTab === "sharing" && shares.length === 0 && shareLinks.length === 0) {
      void loadSharing();
    }
  }, [detailTab, selected, lineage, shares.length, shareLinks.length, loadLineage, loadSharing]);

  const handleDownload = useCallback(async () => {
    if (!token || !selected) return;
    setActionError(null);
    try {
      const blob = await backend.downloadArtifactBlob(
        token,
        selected.asset_type,
        selected.slug
      );
      downloadBlob(blob, artifactFilename(selected));
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }, [token, selected]);

  const handleVisibility = useCallback(
    async (next: ArtifactVisibility) => {
      if (!token || !selected) return;
      if (
        next === "public" &&
        !window.confirm(
          "Publish this artifact to the global Hub? Anyone will be able to inspect and download it. PCAPs and blueprints are scanned for credentials and private infrastructure before promotion."
        )
      ) {
        return;
      }
      setActionError(null);
      try {
        await backend.setArtifactVisibility(
          token,
          selected.asset_type,
          selected.slug,
          next
        );
        setNotice(
          next === "public"
            ? "Published to the Hub. The asset is now visible to anonymous users."
            : "Returned to private tenant isolation."
        );
        setSelected({
          ...selected,
          visibility: next,
          permissions:
            next === "public"
              ? ["VIEW", "FORK", "DEPLOY", "ADMIN"]
              : selected.permissions,
        });
        await refreshList();
      } catch (err) {
        setActionError(errorMessage(err));
      }
    },
    [token, selected, refreshList]
  );

  const handleDelete = useCallback(async () => {
    if (!token || !selected) return;
    if (
      !window.confirm(
        `Delete “${selected.name}”? If downstream forks exist, the root will be marked orphaned and bytes are preserved.`
      )
    ) {
      return;
    }
    setActionError(null);
    try {
      const result = await backend.workspaceDelete(
        token,
        selected.asset_type,
        selected.slug
      );
      setSelected(null);
      setNotice(
        result.status === "orphaned_root"
          ? "Asset hidden and marked orphaned_root; downstream forks keep their bytes."
          : "Asset deleted from your workspace."
      );
      await refreshList();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }, [token, selected, refreshList]);

  const handleFork = useCallback(async () => {
    if (!token || !selected) return;
    setActionError(null);
    try {
      const child = await backend.forkArtifact(
        token,
        selected.asset_type,
        selected.slug,
        forkSlug.trim() ? { new_slug: forkSlug.trim() } : undefined
      );
      setForkOpen(false);
      setNotice(`Fork created: ${child.slug}. Forks are private to your workspace.`);
      await refreshList();
      await openDetail(child.asset_type, child.slug);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }, [token, selected, forkSlug, refreshList, openDetail]);

  const isAdmin =
    user?.role === "super_admin" ||
    user?.role === "tenant_admin" ||
    user?.role === "admin";
  const canAdmin = !!selected?.permissions?.includes("ADMIN");
  const canEdit = canAdmin || (!!selected && !selected.owner_user_id && isAdmin);
  const canFork = !!selected?.permissions?.includes("FORK");

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of pageData?.results ?? []) {
      counts.set(item.asset_type, (counts.get(item.asset_type) ?? 0) + 1);
    }
    return counts;
  }, [pageData]);

  const scopeOptions = hubMode
    ? HUB_SCOPE_ORDER.map((id) => SCOPES.find((item) => item.id === id)).filter(
        (item): item is (typeof SCOPES)[number] => !!item
      )
    : SCOPES;

  return (
    <div className="space-y-6">
      <PageHeader
        title={hubMode ? "Artifact Hub" : "Artifact Workspace"}
        description={
          hubMode
            ? "Search every authorized artifact, inspect provenance, download, fork and share — the Hub discovery experience inside your dashboard."
            : "Seven artifact classes, one sovereign control plane — inspect, fork, share and publish without leaving your tenant."
        }
        breadcrumbs={
          hubMode
            ? [
                { label: "AI & Sentinel-Hub", href: "/hub/store" },
                { label: "Artifact Hub" },
              ]
            : [
                { label: "AI & Sentinel-Hub", href: "/hub/store" },
                { label: "Artifacts" },
              ]
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="cyan">
              {hubMode ? "Hub search & actions" : "7 artifact types"}
            </Badge>
            <Button onClick={() => setUploadOpen(true)}>↑ Upload artifact</Button>
          </div>
        }
      />

      {(notice || error || actionError) && (
        <div className="space-y-2">
          {notice && (
            <div className="rounded-md border border-kernel/30 bg-kernel/5 px-4 py-3 text-[12.5px] text-kernel">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-md border border-threat/30 bg-threat/5 px-4 py-3 text-[12.5px] text-threat">
              {error}
            </div>
          )}
          {actionError && (
            <div className="rounded-md border border-threat/30 bg-threat/5 px-4 py-3 text-[12.5px] text-threat">
              {actionError}
            </div>
          )}
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {scopeOptions.map((item) => {
            const active = scope === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setScope(item.id)}
                title={item.hint}
                className={`rounded-md border px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.1em] transition-colors ${
                  active
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-hairline text-muted hover:border-cyan/30 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/hub/store"
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-cyan"
            >
              Hub storefront ↗
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search artifacts</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              ⌕
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, slug, protocol or manifest text…"
              className="w-full rounded-md border border-hairline bg-void py-2.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted/60 focus:border-cyan/60 focus:outline-none"
            />
          </label>
          <span className="font-mono text-[10.5px] text-muted">
            {pageData ? `${pageData.total} accessible artifact${pageData.total === 1 ? "" : "s"}` : "…"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKind("all")}
            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
              kind === "all"
                ? "border-cyan/50 bg-cyan/10 text-cyan"
                : "border-hairline text-muted hover:text-ink"
            }`}
          >
            ▦ All types
            <span className="text-[9px] opacity-70">{pageData?.total ?? 0}</span>
          </button>
          {TYPES.map((item) => {
            const active = kind === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setKind(item.id)}
                className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] ${
                  active
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-hairline text-muted hover:text-ink"
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
                <span className="text-[9px] opacity-70">{typeCounts.get(item.id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Loading artifact control plane…
          </p>
        </Card>
      ) : (pageData?.results.length ?? 0) === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-display text-[18px] font-bold text-ink">No artifacts here yet.</p>
          <p className="mx-auto mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
            Upload an asset into your private workspace, fork a public Hub artifact, or accept a
            direct share from another team.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => setUploadOpen(true)}>Upload artifact</Button>
            <Button variant="secondary" href="/hub/store">
              Browse public Hub
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pageData?.results.map((item) => {
            const meta = TYPE_BY_ID.get(item.asset_type as ArtifactType);
            return (
              <button
                key={`${item.asset_type}-${item.slug}`}
                type="button"
                onClick={() => void openDetail(item.asset_type, item.slug)}
                className="group flex h-full flex-col rounded-lg border border-hairline bg-panel p-4 text-left transition-colors hover:border-cyan/40"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-cyan/10 font-display text-[16px] font-bold text-cyan">
                    {meta?.icon ?? "◇"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[14px] font-bold text-ink transition-colors group-hover:text-cyan">
                      {item.name}
                    </p>
                    <p className="mt-1 truncate font-mono text-[10px] text-muted">
                      {item.slug} · v{item.version || "—"}
                    </p>
                  </div>
                  <Badge variant={item.visibility === "public" ? "cyan" : "muted"}>
                    {item.visibility === "public" ? "Public" : "Private"}
                  </Badge>
                </div>

                <p className="mt-3 line-clamp-2 min-h-[2.5em] text-[12px] leading-relaxed text-muted">
                  {item.description || "No description published."}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="muted">{meta?.label ?? pretty(item.asset_type)}</Badge>
                  {item.forked_from && <Badge variant="telemetry">Forked</Badge>}
                  {item.fork_count > 0 && (
                    <Badge variant="muted">{item.fork_count} fork{item.fork_count === 1 ? "" : "s"}</Badge>
                  )}
                  {item.orphaned_root && <Badge variant="threat">Orphaned root</Badge>}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-hairline/70 pt-3 font-mono text-[10px] text-muted">
                  <span>{bytes(item.size_bytes)}</span>
                  <span className="truncate">{item.owner_tenant_id ? "tenant-owned" : "legacy / authority"}</span>
                  <span className="text-cyan opacity-0 transition-opacity group-hover:opacity-100">
                    Inspect →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {pageData && pageData.total_pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[10.5px] text-muted">
            Page {pageData.page} of {pageData.total_pages}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ← Prev
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                setPage((current) =>
                  Math.min(pageData.total_pages, current + 1)
                )
              }
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      {uploadOpen && (
        <UploadModal
          token={token}
          isSuperAdmin={user?.role === "super_admin"}
          onClose={() => setUploadOpen(false)}
          onUploaded={async (detail) => {
            setUploadOpen(false);
            setNotice(`Uploaded ${detail.slug} to your private workspace.`);
            setScope("private");
            await refreshList();
            await openDetail(detail.asset_type, detail.slug);
          }}
        />
      )}

      {(selected || detailLoading) && (
        <Modal
          title={selected ? selected.name : "Loading artifact…"}
          subtitle={
            selected
              ? `${pretty(selected.asset_type)} · ${selected.slug} · v${selected.version || "—"}`
              : undefined
          }
          onClose={() => {
            setSelected(null);
            setDetailLoading(false);
          }}
          wide
        >
          {detailLoading || !selected ? (
            <p className="py-10 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Loading artifact detail…
            </p>
          ) : (
            <div className="space-y-5">
              {notice && (
                <div className="rounded-md border border-kernel/30 bg-kernel/5 px-4 py-3 text-[12px] text-kernel">
                  {notice}
                </div>
              )}
              {actionError && (
                <div className="rounded-md border border-threat/30 bg-threat/5 px-4 py-3 text-[12px] text-threat">
                  {actionError}
                </div>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selected.visibility === "public" ? "cyan" : "muted"}>
                    {selected.visibility === "public" ? "Public · hub.aryorithm.com" : "Private · tenant isolated"}
                  </Badge>
                  <Badge variant={selected.verified_signature ? "kernel" : "telemetry"}>
                    {selected.verified_signature ? "Ed25519 verified" : "Unsigned"}
                  </Badge>
                  {selected.forked_from && (
                    <Badge variant="telemetry">
                      Forked from {selected.forked_from.slug}
                    </Badge>
                  )}
                  {selected.fork_count > 0 && (
                    <Badge variant="muted">{selected.fork_count} downstream forks</Badge>
                  )}
                  {selected.orphaned_root && <Badge variant="threat">Orphaned root</Badge>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void handleDownload()}>
                    ↓ Download
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={canFork ? () => setForkOpen(true) : undefined}
                    className={!canFork ? "opacity-50" : ""}
                  >
                    ⑂ Fork
                  </Button>
                  <Button variant="secondary" onClick={() => setDetailTab("sharing")}>
                    ⇢ Share
                  </Button>
                </div>
              </div>

              {selected.forked_from && (
                <div className="rounded-md border border-cyan/30 bg-cyan/5 px-4 py-3 text-[12px] text-cyan">
                  Forked from{" "}
                  <button
                    type="button"
                    onClick={() =>
                      void openDetail(
                        selected.forked_from!.asset_type,
                        selected.forked_from!.slug
                      )
                    }
                    className="underline underline-offset-2 hover:brightness-125"
                  >
                    {selected.forked_from.asset_type}/{selected.forked_from.slug}
                  </button>
                  {selected.forked_from.version ? `:v${selected.forked_from.version}` : ""}. This fork is
                  private to your workspace until promoted.
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Type" value={pretty(selected.asset_type)} hint={TYPE_BY_ID.get(selected.asset_type as ArtifactType)?.extension} />
                <Metric label="Owner" value={selected.owner_user_id ? "Workspace user" : "Legacy / authority"} hint={selected.owner_tenant_id ? `tenant ${selected.owner_tenant_id.slice(0, 12)}…` : "system-owned"} />
                <Metric label="Size" value={bytes(selected.file_size || selected.size_bytes)} hint={selected.file_name} />
                <Metric label="Published" value={dateLabel(selected.published_at)} hint={`${selected.downloads} downloads`} />
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-md border border-hairline bg-void/40 px-4 py-3">
                <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                  Visibility
                </span>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => void handleVisibility("private")}
                  className={`rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] disabled:opacity-40 ${
                    selected.visibility === "private"
                      ? "border-cyan/50 bg-cyan/10 text-cyan"
                      : "border-hairline text-muted hover:text-ink"
                  }`}
                >
                  Private
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => void handleVisibility("public")}
                  className={`rounded border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] disabled:opacity-40 ${
                    selected.visibility === "public"
                      ? "border-kernel/50 bg-kernel/10 text-kernel"
                      : "border-hairline text-muted hover:text-ink"
                  }`}
                >
                  Public
                </button>
                <span className="text-[11px] text-muted">
                  {canEdit
                    ? "Promotion is scanned for PCAP credentials and blueprint infrastructure leaks."
                    : "Only the artifact owner or a tenant admin can change visibility."}
                </span>
              </div>

              <div className="flex gap-1 overflow-x-auto border-b border-hairline">
                {(["overview", "lineage", "sharing"] as DetailTab[]).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDetailTab(tab)}
                    className={`border-b-2 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                      detailTab === tab
                        ? "border-cyan text-cyan"
                        : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {detailTab === "overview" && (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        Description
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted">
                        {selected.description || "No description published."}
                      </p>
                    </div>
                    <div className="rounded-md border border-hairline bg-void/40 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                          Manifest
                        </p>
                        <span className="font-mono text-[9px] text-muted">read-only</span>
                      </div>
                      <pre className="code-fade mt-3 max-h-[340px] overflow-auto font-mono text-[11px] leading-relaxed text-ink">
                        {JSON.stringify(selected.manifest, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <aside className="space-y-3">
                    <div className="rounded-md border border-hairline bg-void/40 p-4">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                        Integrity
                      </p>
                      <p className="mt-3 break-all font-mono text-[10.5px] leading-relaxed text-kernel">
                        {selected.merkle_sha256 || "not published"}
                      </p>
                    </div>
                    <div className="rounded-md border border-hairline bg-void/40 p-4">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                        Capabilities
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(selected.permissions || []).map((permission) => (
                          <Badge key={permission} variant="muted">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-md border border-hairline bg-void/40 p-4">
                      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                        Author
                      </p>
                      <p className="mt-1.5 text-[12.5px] text-ink">{selected.author || "—"}</p>
                      <p className="mt-1 break-all font-mono text-[9.5px] text-muted">
                        {selected.author_public_key || "authority signed"}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="secondary"
                        onClick={() => void handleDelete()}
                        className="w-full border-threat/40 text-threat"
                      >
                        Delete artifact
                      </Button>
                    )}
                  </aside>
                </div>
              )}

              {detailTab === "lineage" && (
                <div className="space-y-4">
                  {lineageLoading || !lineage ? (
                    <p className="py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
                      Walking fork lineage…
                    </p>
                  ) : (
                    <>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                          Upstream ancestry
                        </p>
                        <div className="mt-2 space-y-2">
                          {lineage.ancestors.length === 0 ? (
                            <p className="rounded border border-hairline bg-void/40 px-3 py-2 text-[12px] text-muted">
                              This is a root artifact — no upstream forks.
                            </p>
                          ) : (
                            lineage.ancestors.map((item) => (
                              <button
                                key={`${item.asset_type}-${item.slug}`}
                                type="button"
                                onClick={() => void openDetail(item.asset_type, item.slug)}
                                className="flex w-full items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2 text-left hover:border-cyan/40"
                              >
                                <span className="font-mono text-[10px] text-cyan">↑</span>
                                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                                  {item.name || item.slug}
                                </span>
                                <span className="font-mono text-[9.5px] text-muted">
                                  {item.asset_type}/{item.slug}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="rounded-md border border-cyan/30 bg-cyan/5 px-4 py-3">
                        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-cyan">
                          Current artifact
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-ink">
                          {lineage.asset.name}{" "}
                          <span className="font-mono text-[10px] text-muted">
                            {lineage.asset.asset_type}/{lineage.asset.slug}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                          Downstream forks
                        </p>
                        <div className="mt-2 space-y-2">
                          {lineage.children.length === 0 ? (
                            <p className="rounded border border-hairline bg-void/40 px-3 py-2 text-[12px] text-muted">
                              No forks yet. Fork this artifact to start a lineage.
                            </p>
                          ) : (
                            lineage.children.map((item) => (
                              <button
                                key={`${item.asset_type}-${item.slug}`}
                                type="button"
                                onClick={() => void openDetail(item.asset_type, item.slug)}
                                className="flex w-full items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2 text-left hover:border-cyan/40"
                              >
                                <span className="font-mono text-[10px] text-cyan">↓</span>
                                <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                                  {item.name || item.slug}
                                </span>
                                <Badge variant={item.visibility === "public" ? "cyan" : "muted"}>
                                  {item.visibility || "unknown"}
                                </Badge>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {detailTab === "sharing" && (
                <SharingPanel
                  token={token}
                  artifact={selected}
                  shares={shares}
                  links={shareLinks}
                  loading={sharingLoading}
                  canManage={canEdit}
                  onRefresh={loadSharing}
                  onError={setActionError}
                  onNotice={setNotice}
                />
              )}
            </div>
          )}
        </Modal>
      )}

      {forkOpen && selected && (
        <Modal
          title="Fork artifact"
          subtitle="Create an independent private copy in your workspace. Storage uses hard-links / copy-on-write where available."
          onClose={() => setForkOpen(false)}
        >
          <div className="space-y-4">
            <Field
              label="New slug"
              hint="Leave the default to generate a collision-safe fork slug."
            >
              <input
                value={forkSlug}
                onChange={(event) => setForkSlug(event.target.value)}
                className={inputClass}
                placeholder={`${selected.slug}-fork`}
              />
            </Field>
            <div className="rounded-md border border-hairline bg-void/40 px-4 py-3 text-[12px] text-muted">
              <p>
                Source: <span className="font-mono text-cyan">{selected.asset_type}/{selected.slug}</span>
              </p>
              <p className="mt-1">
                The fork inherits metadata, readme and binary bytes, then starts private to your
                tenant. Changes never overwrite the upstream artifact.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setForkOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void handleFork()} className={!canFork ? "opacity-50" : ""}>
                Create private fork
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-hairline bg-void/40 p-3.5">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1.5 truncate font-display text-[14px] font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 truncate font-mono text-[9.5px] text-muted">{hint}</p>}
    </div>
  );
}

function UploadModal({
  token,
  isSuperAdmin,
  onClose,
  onUploaded,
}: {
  token: string | null;
  isSuperAdmin: boolean;
  onClose: () => void;
  onUploaded: (detail: UnifiedArtifactDetail) => void | Promise<void>;
}) {
  const [kind, setKind] = useState<ArtifactType>("package");
  const [slug, setSlug] = useState("my-artifact");
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState(() =>
    JSON.stringify(defaultTemplate("package", "my-artifact"), null, 2)
  );
  const [signature, setSignature] = useState("");
  const [visibility, setVisibility] = useState<ArtifactVisibility>("private");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeType = (next: ArtifactType) => {
    setKind(next);
    setManifest(JSON.stringify(defaultTemplate(next, slug || "my-artifact"), null, 2));
  };

  const changeSlug = (next: string) => {
    setSlug(next);
    try {
      const parsed = JSON.parse(manifest) as Record<string, unknown>;
      parsed.slug = next;
      setManifest(JSON.stringify(parsed, null, 2));
    } catch {
      /* keep free-form manifest */
    }
  };

  const submit = async () => {
    if (!token) return;
    setError(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(manifest) as Record<string, unknown>;
    } catch {
      setError("Manifest must be valid JSON.");
      return;
    }
    if (!parsed.slug && slug) parsed.slug = slug;
    if (kind === "appliance" && !isSuperAdmin) {
      setError("Only super_admin may publish authority-signed appliances.");
      return;
    }
    if (kind === "appliance" && !signature.trim()) {
      setError("Appliances require an Ed25519 signature from the Aryorithm Authority Root.");
      return;
    }
    if (
      visibility === "public" &&
      !window.confirm(
        "Publish this artifact immediately to the public Hub? The backend will scan PCAP and blueprint contents, but you should remove private IPs, hostnames, keys and customer identifiers from all seven artifact types before promotion."
      )
    ) {
      return;
    }
    const form = new FormData();
    form.append("asset_type", kind);
    form.append("file", file);
    form.append("manifest", JSON.stringify(parsed));
    form.append("visibility", visibility);
    if (signature.trim()) form.append("signature", signature.trim());
    setUploading(true);
    try {
      const result = await backend.workspaceUpload(token, form);
      if (result.detail) {
        await onUploaded(result.detail);
      } else {
        const detail = await backend.workspaceArtifact(
          token,
          result.asset_type,
          result.slug
        );
        await onUploaded(detail);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="Upload artifact"
      subtitle="Workspace uploads are signed server-side with the deployment key; private is the default."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Artifact type">
            <select
              value={kind}
              onChange={(event) => changeType(event.target.value as ArtifactType)}
              className={inputClass}
            >
              {TYPES.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  disabled={item.id === "appliance" && !isSuperAdmin}
                >
                  {item.label} {item.extension}
                  {item.id === "appliance" && !isSuperAdmin ? " — super_admin only" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Slug" hint="Normalized; archive suffixes are stripped.">
            <input value={slug} onChange={(event) => changeSlug(event.target.value)} className={inputClass} />
          </Field>
          <Field label="Visibility">
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as ArtifactVisibility)}
              className={inputClass}
            >
              <option value="private">Private — tenant only</option>
              <option value="public">Public — publish after sanitization</option>
            </select>
          </Field>
        </div>

        <Field label="File" hint="Browser uploads use the server deployment signing key when no author signature is supplied.">
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className={`${inputClass} py-2 file:mr-3 file:rounded file:border-0 file:bg-cyan/10 file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.1em] file:text-cyan`}
          />
        </Field>

        <Field
          label="Ed25519 signature (optional)"
          hint="64-byte signature as hex/base64. Leave blank for server signing; appliances require the Authority Root signature."
        >
          <input
            value={signature}
            onChange={(event) => setSignature(event.target.value)}
            className={`${inputClass} font-mono text-[11px]`}
            placeholder="leave blank to server-sign"
            spellCheck={false}
          />
        </Field>

        <Field label="Manifest JSON" hint="Type-specific fields are pre-filled; adjust for your artifact.">
          <textarea
            value={manifest}
            onChange={(event) => setManifest(event.target.value)}
            rows={16}
            spellCheck={false}
            className={`${inputClass} font-mono text-[11px] leading-relaxed`}
          />
        </Field>

        {error && (
          <p className="rounded border border-threat/30 bg-threat/5 px-3 py-2 text-[12px] text-threat">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} className={uploading ? "opacity-60" : ""}>
            {uploading ? "Uploading…" : "Upload to workspace"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SharingPanel({
  token,
  artifact,
  shares,
  links,
  loading,
  canManage,
  onRefresh,
  onError,
  onNotice,
}: {
  token: string | null;
  artifact: UnifiedArtifactDetail;
  shares: ArtifactShare[];
  links: ArtifactShareLink[];
  loading: boolean;
  canManage: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onNotice: (message: string | null) => void;
}) {
  const [granteeType, setGranteeType] = useState<ShareGrantee>("user");
  const [grantee, setGrantee] = useState("");
  const [permission, setPermission] = useState<SharePermission>("VIEW");
  const [expires, setExpires] = useState("");
  const [linkPermission, setLinkPermission] = useState<"VIEW" | "FORK" | "DEPLOY">("VIEW");
  const [linkHours, setLinkHours] = useState(72);
  const [linkMaxUses, setLinkMaxUses] = useState("");
  const [latestLink, setLatestLink] = useState<ArtifactShareLink | null>(null);
  const [busy, setBusy] = useState(false);

  const createShare = async () => {
    if (!token || !canManage) return;
    onError(null);
    setBusy(true);
    try {
      await backend.createArtifactShare(token, artifact.asset_type, artifact.slug, {
        grantee_type: granteeType,
        grantee_id: granteeType === "email" ? null : grantee.trim() || null,
        grantee_email: granteeType === "email" ? grantee.trim() || null : null,
        permission,
        expires_at: expires ? new Date(expires).toISOString() : null,
      });
      setGrantee("");
      onNotice("Share grant created.");
      await onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const removeShare = async (shareId: string) => {
    if (!token || !canManage) return;
    onError(null);
    try {
      await backend.deleteArtifactShare(token, artifact.asset_type, artifact.slug, shareId);
      onNotice("Share grant revoked.");
      await onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  const createLink = async () => {
    if (!token || !canManage) return;
    onError(null);
    setBusy(true);
    try {
      const link = await backend.createArtifactShareLink(
        token,
        artifact.asset_type,
        artifact.slug,
        {
          permission: linkPermission,
          expires_in_hours: linkHours,
          max_uses: linkMaxUses ? Number(linkMaxUses) : null,
        }
      );
      setLatestLink(link);
      onNotice("Signed expiring share link generated.");
      await onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revokeLink = async (linkId: string) => {
    if (!token || !canManage) return;
    onError(null);
    try {
      await backend.revokeArtifactShareLink(token, artifact.asset_type, artifact.slug, linkId);
      if (latestLink?.id === linkId) setLatestLink(null);
      onNotice("Share link revoked.");
      await onRefresh();
    } catch (err) {
      onError(errorMessage(err));
    }
  };

  if (loading) {
    return (
      <p className="py-8 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
        Loading sharing grants…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {!canManage && (
        <div className="rounded-md border border-telemetry/30 bg-telemetry/5 px-4 py-3 text-[12px] text-telemetry">
          You have {artifact.permissions.join(", ") || "no"} permissions. ADMIN is required to
          create or revoke shares.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-hairline bg-void/40 p-4">
          <p className="font-display text-[13px] font-semibold text-ink">Direct access</p>
          <p className="mt-1 text-[11.5px] text-muted">
            Grant a user, tenant or email address scoped access to this artifact.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <Field label="Grantee type">
              <select
                value={granteeType}
                onChange={(event) => setGranteeType(event.target.value as ShareGrantee)}
                className={inputClass}
              >
                <option value="user">User ID</option>
                <option value="tenant">Tenant ID</option>
                <option value="email">Email address</option>
              </select>
            </Field>
            <Field label={granteeType === "email" ? "Email" : `${pretty(granteeType)} ID`}>
              <input
                value={grantee}
                onChange={(event) => setGrantee(event.target.value)}
                className={inputClass}
                placeholder={granteeType === "email" ? "auditor@example.com" : `${granteeType}_…`}
              />
            </Field>
            <Field label="Permission">
              <select
                value={permission}
                onChange={(event) => setPermission(event.target.value as SharePermission)}
                className={inputClass}
              >
                {PERMISSIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.hint}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Expires (optional)">
              <input
                type="datetime-local"
                value={expires}
                onChange={(event) => setExpires(event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Button
            onClick={() => void createShare()}
            className={`mt-3 ${!canManage || busy ? "opacity-50" : ""}`}
          >
            Add share grant
          </Button>
        </div>

        <div className="rounded-md border border-hairline bg-void/40 p-4">
          <p className="font-display text-[13px] font-semibold text-ink">
            Expiring signed link
          </p>
          <p className="mt-1 text-[11.5px] text-muted">
            Third-party forensic auditors can inspect without an Aryorithm account. Links are
            HMAC-signed and can be use-limited.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <Field label="Permission">
              <select
                value={linkPermission}
                onChange={(event) =>
                  setLinkPermission(event.target.value as "VIEW" | "FORK" | "DEPLOY")
                }
                className={inputClass}
              >
                <option value="VIEW">Viewer</option>
                <option value="FORK">Forker</option>
                <option value="DEPLOY">Edge deployer</option>
              </select>
            </Field>
            <Field label="Expires in hours">
              <input
                type="number"
                min={1}
                max={8760}
                value={linkHours}
                onChange={(event) => setLinkHours(Number(event.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Max uses (optional)">
              <input
                type="number"
                min={1}
                value={linkMaxUses}
                onChange={(event) => setLinkMaxUses(event.target.value)}
                className={inputClass}
                placeholder="unlimited"
              />
            </Field>
          </div>
          <Button
            onClick={() => void createLink()}
            className={`mt-3 ${!canManage || busy ? "opacity-50" : ""}`}
          >
            Generate link
          </Button>
          {latestLink?.url && (
            <div className="mt-3 rounded border border-kernel/30 bg-kernel/5 px-3 py-2">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-kernel">
                New share link
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-ink">
                  {latestLink.url}
                </code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(latestLink.url || "")}
                  className="rounded border border-cyan/40 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Active grants
          </p>
          <div className="mt-2 space-y-2">
            {shares.length === 0 ? (
              <p className="rounded border border-hairline bg-void/40 px-3 py-2 text-[12px] text-muted">
                No direct shares yet.
              </p>
            ) : (
              shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-ink">
                      {share.grantee_email || share.grantee_id || share.grantee_type}
                    </p>
                    <p className="font-mono text-[9.5px] text-muted">
                      {pretty(share.grantee_type)} · {share.permission}
                      {share.expires_at ? ` · expires ${dateLabel(share.expires_at)}` : " · no expiry"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canManage}
                    onClick={() => void removeShare(share.id)}
                    className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted hover:border-threat/40 hover:text-threat disabled:opacity-40"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Share links
          </p>
          <div className="mt-2 space-y-2">
            {links.length === 0 ? (
              <p className="rounded border border-hairline bg-void/40 px-3 py-2 text-[12px] text-muted">
                No links generated yet.
              </p>
            ) : (
              links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-ink">
                      {link.permission} · {link.use_count}/{link.max_uses ?? "∞"} uses
                    </p>
                    <p className="font-mono text-[9.5px] text-muted">
                      {link.revoked
                        ? "revoked"
                        : link.expires_at
                          ? `expires ${dateLabel(link.expires_at)}`
                          : "no expiry"}
                    </p>
                  </div>
                  {!link.revoked && (
                    <button
                      type="button"
                      disabled={!canManage}
                      onClick={() => void revokeLink(link.id)}
                      className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted hover:border-threat/40 hover:text-threat disabled:opacity-40"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-hairline bg-void/40 px-4 py-3">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
          Public share endpoint
        </p>
        <p className="mt-1 text-[11.5px] text-muted">
          Generated links resolve at{" "}
          <span className="font-mono text-cyan">app.aryorithm.com/share/&lt;token&gt;</span>.
          Anonymous download URLs carry <span className="font-mono">?share_token=</span>.
        </p>
      </div>
    </div>
  );
}
