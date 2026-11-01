"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { memberArtifacts, type HubAssetListItem, type HubAssetType, type MemberUploadResult } from "@/lib/hub";
import { getSession, type HubSession } from "@/lib/session";
import { ssGet } from "@/lib/shared-storage";

const TOKEN_KEY = "aryorithm_token";

const TYPES: { id: HubAssetType; label: string; extension: string; hint: string }[] = [
  { id: "package", label: "Package", extension: ".spkg", hint: "Kernel, WASM or Lua extension" },
  { id: "dataset", label: "Dataset", extension: ".slab", hint: "Training or benchmark corpus" },
  { id: "model", label: "Model", extension: ".onnx", hint: "ONNX / SafeTensors model artifact" },
  { id: "pcap", label: "PCAP", extension: ".pcap", hint: "Sanitized packet capture" },
  { id: "scenario", label: "Scenario", extension: ".tar.gz", hint: "Cyber-range scenario bundle" },
  { id: "blueprint", label: "Blueprint", extension: ".blueprint", hint: "Production deployment DAG" },
  { id: "appliance", label: "Appliance", extension: ".aryopack", hint: "Authority-signed system image" },
];

const TYPE_BY_ID = new Map(TYPES.map((item) => [item.id, item]));

function defaultTemplate(type: HubAssetType, slug: string): Record<string, unknown> {
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

const inputCls =
  "mt-1.5 w-full rounded-md border border-hairline bg-void px-3 py-2.5 text-[12.5px] text-ink placeholder:text-muted/60 focus:border-cyan/60 focus:outline-none";
const labelCls =
  "font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted";

function messageFor(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "The upload could not be completed.";
}

function ArtifactRow({ item }: { item: HubAssetListItem }) {
  return (
    <li className="flex items-center gap-3 border-b border-hairline/60 py-2.5 last:border-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-hairline bg-void/60 font-mono text-[10px] uppercase text-cyan">
        {item.asset_type.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/assets/${item.asset_type}/${item.slug}`}
          className="block truncate text-[12.5px] font-medium text-ink transition-colors hover:text-cyan"
        >
          {item.name || item.slug}
        </Link>
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted">
          {item.asset_type} · v{item.version} · {item.visibility}
        </p>
      </div>
      <Link
        href={`/assets/${item.asset_type}/${item.slug}`}
        className="shrink-0 font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:underline"
      >
        Open
      </Link>
    </li>
  );
}

export default function UploadArtifactView() {
  const [session, setSession] = useState<HubSession | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [owned, setOwned] = useState<HubAssetListItem[]>([]);
  const [shared, setShared] = useState<HubAssetListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [kind, setKind] = useState<HubAssetType>("package");
  const [slug, setSlug] = useState("my-artifact");
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState(() =>
    JSON.stringify(defaultTemplate("package", "my-artifact"), null, 2)
  );
  const [signature, setSignature] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<MemberUploadResult | null>(null);

  const loadLists = useCallback(async (accessToken: string | null) => {
    setListLoading(true);
    try {
      const [mine, received] = await Promise.all([
        memberArtifacts.list({ scope: "owned", limit: 6, sort: "latest" }, accessToken),
        memberArtifacts.list({ scope: "shared", limit: 6, sort: "latest" }, accessToken),
      ]);
      setOwned(mine.results);
      setShared(received.results);
    } catch {
      /* Lists are secondary; the upload form stays usable. */
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await getSession();
      if (cancelled) return;
      setSession(me);
      if (!me) return;
      const accessToken = await ssGet(TOKEN_KEY);
      if (cancelled) return;
      setToken(accessToken);
      await loadLists(accessToken);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadLists]);

  const changeType = (next: HubAssetType) => {
    setKind(next);
    setManifest(JSON.stringify(defaultTemplate(next, slug || "my-artifact"), null, 2));
    setError(null);
    setResult(null);
  };

  const changeSlug = (next: string) => {
    setSlug(next);
    try {
      const parsed = JSON.parse(manifest) as Record<string, unknown>;
      parsed.slug = next;
      setManifest(JSON.stringify(parsed, null, 2));
    } catch {
      /* keep the manifest as typed */
    }
  };

  const resetForm = () => {
    setFile(null);
    setSignature("");
    setManifest(JSON.stringify(defaultTemplate(kind, slug || "my-artifact"), null, 2));
    setResult(null);
    setError(null);
    setNotice(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setResult(null);
    if (!session) {
      setError("Sign in to upload artifacts.");
      return;
    }
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
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      setError("Manifest must be a JSON object.");
      return;
    }
    if (!parsed.slug && slug) parsed.slug = slug;
    if (kind === "appliance" && session.role !== "super_admin") {
      setError("Only super_admin may upload authority-signed appliances.");
      return;
    }
    if (kind === "appliance" && !signature.trim()) {
      setError("Appliance uploads require an Ed25519 signature from the Authority Root.");
      return;
    }
    if (
      visibility === "public" &&
      !window.confirm(
        "Publish this artifact to the public Hub? Anyone will be able to inspect and download it. Remove credentials, private IPs, hostnames and customer identifiers first. PCAPs and blueprints are automatically scanned before promotion."
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
      const uploaded = await memberArtifacts.upload(form, token);
      setResult(uploaded);
      setNotice(
        uploaded.visibility === "public"
          ? `Published ${uploaded.slug} to the public Hub.`
          : `Uploaded ${uploaded.slug} to your private workspace.`
      );
      setFile(null);
      setSignature("");
      await loadLists(token);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setUploading(false);
    }
  };

  if (session === undefined) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
        <div className="rounded-md border border-hairline bg-panel p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading member workspace…
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-[820px] px-5 pb-20 pt-24 lg:px-8">
        <div className="rounded-md border border-hairline bg-panel p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan">
            {"// Member artifact intake"}
          </p>
          <h1 className="mt-3 font-display text-[28px] font-bold text-ink">
            Sign in to upload your artifacts.
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
            Upload packages, datasets, models, PCAPs, scenarios, blueprints and
            appliances with your normal member session. No developer API token
            is required.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="rounded-md bg-cyan px-4 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-hairline px-4 py-2.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-20 pt-24 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            {"// Member artifact intake"}
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink lg:text-[38px]">
            Upload your own artifacts.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Signed in as <span className="text-ink">{session.name || session.email}</span>.
            Your session is enough — workspace uploads are server-signed and
            private by default.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-kernel/30 bg-kernel/5 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-kernel">
            Session authenticated
          </span>
          <Link
            href="/explore?scope=owned"
            className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-cyan"
          >
            My artifacts →
          </Link>
        </div>
      </div>

      {notice && (
        <div className="mt-4 rounded-md border border-kernel/30 bg-kernel/5 px-4 py-3 text-[12.5px] text-kernel">
          {notice}
        </div>
      )}
      {error && (
        <div className="mt-4 rounded-md border border-threat/30 bg-threat/5 px-4 py-3 text-[12.5px] text-threat">
          {error}
        </div>
      )}
      {result && (
        <div className="mt-4 rounded-md border border-cyan/30 bg-cyan/5 px-4 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan">
                Upload complete · {result.asset_type}/{result.slug}
              </p>
              <p className="mt-1 text-[12px] text-muted">
                {result.detail?.name || result.slug} · {result.visibility} ·{" "}
                {result.detail?.verified_signature ? "signature verified" : "signature recorded"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/assets/${result.asset_type}/${result.slug}`}
                className="rounded-md border border-cyan/50 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10"
              >
                Inspect artifact
              </Link>
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
              >
                Upload another
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(310px,0.85fr)]">
        <form onSubmit={submit} className="rounded-md border border-hairline bg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                New artifact
              </p>
              <h2 className="mt-1 font-display text-[20px] font-bold text-ink">
                {TYPE_BY_ID.get(kind)?.label || kind} upload
              </h2>
              <p className="mt-1 text-[12px] text-muted">
                {TYPE_BY_ID.get(kind)?.hint}
              </p>
            </div>
            <span className="rounded border border-hairline px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
              {TYPE_BY_ID.get(kind)?.extension}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Artifact type</span>
              <select
                value={kind}
                onChange={(event) => changeType(event.target.value as HubAssetType)}
                className={inputCls}
              >
                {TYPES.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.id === "appliance" && session.role !== "super_admin"}
                  >
                    {item.label} ({item.extension})
                    {item.id === "appliance" && session.role !== "super_admin"
                      ? " — super_admin only"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Slug</span>
              <input
                value={slug}
                onChange={(event) => changeSlug(event.target.value)}
                className={inputCls}
                placeholder="my-artifact"
              />
            </label>
            <label className="block">
              <span className={labelCls}>Visibility</span>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as "private" | "public")}
                className={inputCls}
              >
                <option value="private">Private — workspace only</option>
                <option value="public">Public — publish to Hub</option>
              </select>
            </label>
          </div>

          <label className="mt-3 block">
            <span className={labelCls}>Artifact file</span>
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-1.5 block w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[11px] text-muted file:mr-3 file:rounded file:border-0 file:bg-cyan/10 file:px-2.5 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.1em] file:text-cyan"
            />
            {file && (
              <span className="mt-1 block font-mono text-[10px] text-muted">
                {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </label>

          <label className="mt-3 block">
            <span className={labelCls}>Ed25519 signature (optional)</span>
            <input
              value={signature}
              onChange={(event) => setSignature(event.target.value)}
              className={`${inputCls} font-mono text-[11px]`}
              placeholder="Leave blank — the server signs workspace uploads"
              spellCheck={false}
            />
          </label>

          <label className="mt-3 block">
            <span className={labelCls}>Manifest JSON</span>
            <textarea
              value={manifest}
              onChange={(event) => setManifest(event.target.value)}
              rows={15}
              spellCheck={false}
              className={`${inputCls} font-mono text-[11px] leading-relaxed`}
            />
          </label>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-md text-[11.5px] leading-relaxed text-muted">
              Private is the default. Public promotion triggers PCAP and blueprint
              sanitization checks before the artifact enters the catalog.
            </p>
            <button
              type="submit"
              disabled={uploading}
              className="rounded-md bg-cyan px-4 py-2.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload artifact"}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <section className="rounded-md border border-hairline bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  My uploads
                </p>
                <h2 className="mt-1 font-display text-[17px] font-bold text-ink">
                  Latest artifacts
                </h2>
              </div>
              <Link
                href="/explore?scope=owned"
                className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:underline"
              >
                View all →
              </Link>
            </div>
            {listLoading ? (
              <p className="mt-4 font-mono text-[11px] text-muted">Loading…</p>
            ) : owned.length === 0 ? (
              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                You have not uploaded an artifact yet. Your first upload will appear here.
              </p>
            ) : (
              <ul className="mt-3">
                {owned.map((item) => (
                  <ArtifactRow key={`${item.asset_type}:${item.slug}`} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-hairline bg-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Shared with me
                </p>
                <h2 className="mt-1 font-display text-[17px] font-bold text-ink">
                  Received artifacts
                </h2>
              </div>
              <Link
                href="/explore?scope=shared"
                className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-cyan hover:underline"
              >
                View all →
              </Link>
            </div>
            {listLoading ? (
              <p className="mt-4 font-mono text-[11px] text-muted">Loading…</p>
            ) : shared.length === 0 ? (
              <p className="mt-4 text-[12px] leading-relaxed text-muted">
                No artifacts have been explicitly shared with you yet.
              </p>
            ) : (
              <ul className="mt-3">
                {shared.map((item) => (
                  <ArtifactRow key={`${item.asset_type}:${item.slug}`} item={item} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-md border border-hairline bg-void/40 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
              Session upload contract
            </p>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-muted">
              <li>✓ No developer API token or CLI key needed</li>
              <li>✓ Uploads are bound to your user and tenant</li>
              <li>✓ Missing signatures are filled by the deployment key</li>
              <li>✓ Sharing and visibility are managed from your workspace</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
