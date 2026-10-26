"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { api } from "@/lib/api";
import { getSession, type HubSession } from "@/lib/session";
import { ssGet } from "@/lib/shared-storage";
import {
  blueprints,
  type BlueprintListResult,
  type HubSearchResult,
} from "@/lib/hub";

interface TokenRow {
  token_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  expires_at: string | null;
  revoked: boolean;
  last_used: string | null;
  created_at: string | null;
}

interface TokenCreate {
  token_id: string;
  name: string;
  api_key: string;
  created_at: string;
}

interface Validation {
  valid: boolean;
  scopes: string[];
  quota: { max_upload_bytes: number; scopes: string[] };
  user: { user_id: string; email: string; name: string; role: string };
}

interface PublishResult {
  status?: string;
  slug: string;
  asset_type: string;
  version?: string;
  download_url?: string;
  url?: string;
}

const TOKEN_KEY = "aryorithm_token";
const UPLOAD_TYPES = ["package", "model", "dataset", "pcap", "scenario", "blueprint"] as const;
type UploadType = (typeof UPLOAD_TYPES)[number];

const SCOPES = ["packages:publish", "packages:validate"] as const;

const inputCls =
  "w-full rounded-md border border-hairline bg-void px-3 py-2.5 text-[12.5px] text-ink placeholder:text-muted/60 focus:border-cyan/60 focus:outline-none";
const labelCls =
  "mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted";

function dateLabel(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Request failed.";
}

export default function DeveloperPortalView() {
  const [session, setSession] = useState<HubSession | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [publicKey, setPublicKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...SCOPES]);
  const [expiry, setExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [newSecret, setNewSecret] = useState<TokenCreate | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [uploadType, setUploadType] = useState<UploadType>("package");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [manifestText, setManifestText] = useState("");
  const [signatureText, setSignatureText] = useState("");
  const [lintMessage, setLintMessage] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const me = await getSession();
      if (cancelled) return;
      setSession(me);
      if (!me) {
        setLoading(false);
        return;
      }
      const accessToken = await ssGet(TOKEN_KEY);
      if (cancelled) return;
      setToken(accessToken);

      const [tokenRows, validationResult, unified, blueprintRows] = await Promise.all([
        accessToken
          ? api.get<TokenRow[]>("/registry/tokens", { token: accessToken }).catch(() => [])
          : Promise.resolve([]),
        accessToken
          ? api
              .get<Validation>("/registry/tokens/validate", { token: accessToken })
              .catch(() => null)
          : Promise.resolve(null),
        api
          .get<HubSearchResult>("/hub/search?limit=100")
          .catch(() => ({ total: 0, page: 1, limit: 100, total_pages: 1, results: [] })),
        blueprints
          .list({ limit: 100 })
          .catch(() => ({ total: 0, page: 1, limit: 100, total_pages: 1, results: [] })),
      ]);
      if (cancelled) return;
      setTokens(tokenRows);
      setValidation(validationResult);

      const names = new Set(
        [me.name, me.email].filter(Boolean).map((value) => value.toLowerCase())
      );
      const unifiedMatch = (unified as HubSearchResult).results?.find((row) =>
        names.has((row.author || "").toLowerCase())
      );
      const blueprintMatch = (blueprintRows as BlueprintListResult).results?.find((row) =>
        names.has((row.author || "").toLowerCase())
      );
      setPublicKey(
        unifiedMatch?.author_public_key || blueprintMatch?.author_public_key || ""
      );
    }

    load()
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const publishScopes = useMemo(
    () => validation?.scopes || selectedScopes,
    [validation, selectedScopes]
  );

  async function reloadTokens() {
    if (!token) return;
    try {
      const rows = await api.get<TokenRow[]>("/registry/tokens", { token });
      setTokens(rows);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function createToken() {
    if (!token) {
      setError("Sign in to create a token.");
      return;
    }
    if (!tokenName.trim()) {
      setError("Give the token a descriptive name.");
      return;
    }
    if (selectedScopes.length === 0) {
      setError("Select at least one scope.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await api.post<TokenCreate>(
        "/registry/tokens",
        {
          name: tokenName.trim(),
          scopes: selectedScopes,
          expires_in_days: expiry === "never" ? null : Number(expiry),
        },
        { token }
      );
      setNewSecret(created);
      setCreateOpen(false);
      setTokenName("");
      setSelectedScopes([...SCOPES]);
      setExpiry("90");
      await reloadTokens();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function revokeToken(row: TokenRow) {
    if (!token) return;
    if (!window.confirm(`Revoke “${row.name}”? CLI clients using it will stop publishing.`)) {
      return;
    }
    setRevoking(row.token_id);
    setError(null);
    try {
      await api.del<TokenRow>(`/registry/tokens/${encodeURIComponent(row.token_id)}`, undefined, {
        token,
      });
      setTokens((rows) =>
        rows.map((item) => (item.token_id === row.token_id ? { ...item, revoked: true } : item))
      );
      setNotice(`Token “${row.name}” revoked.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRevoking(null);
    }
  }

  function validateManifest() {
    setLintMessage(null);
    try {
      const parsed = JSON.parse(manifestText);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("Manifest must be a JSON object.");
      }
      if (!parsed.name && !parsed.title && !parsed.slug) {
        setLintMessage("Valid JSON, but add a name, title or slug before publishing.");
        return;
      }
      setLintMessage(
        uploadType === "blueprint"
          ? "Pre-flight passed: blueprint manifest is valid JSON. The registry will validate the signed .blueprint archive and raw DAG on publish."
          : "Pre-flight passed: manifest is valid JSON and identifies the asset."
      );
    } catch (err) {
      setLintMessage(`Pre-flight failed: ${errorMessage(err)}`);
    }
  }

  async function publish() {
    if (!token) {
      setPublishError("Sign in to publish.");
      return;
    }
    if (!uploadFile) {
      setPublishError("Choose the signed asset file.");
      return;
    }
    if (!manifestText.trim()) {
      setPublishError("Paste the asset manifest.");
      return;
    }
    if (!signatureText.trim()) {
      setPublishError("Paste the 64-byte Ed25519 signature.");
      return;
    }
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);
    try {
      const form = new FormData();
      form.append("file", uploadFile);
      form.append("manifest", manifestText.trim());
      form.append("signature", signatureText.trim());
      if (uploadType !== "blueprint") form.append("asset_type", uploadType);
      const endpoint =
        uploadType === "blueprint" ? "/hub/blueprints/publish" : "/hub/publish";
      const result = await api.postForm<PublishResult>(endpoint, form, { token });
      setPublishResult(result);
      setNotice(`Published ${uploadType} “${result.slug}”.`);
      setUploadFile(null);
      setSignatureText("");
    } catch (err) {
      setPublishError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
        <div className="rounded-md border border-hairline bg-panel p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
            Loading developer identity…
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
            {"// Developer portal"}
          </p>
          <h1 className="mt-3 font-display text-[28px] font-bold text-ink">
            Sign in to manage publication keys.
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted">
            CLI tokens, developer identity and signed web uploads are available to authenticated
            members. One sign-in is shared across Hub, Dashboard and the main site.
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
    <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            {"// Developer Portal"}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight text-ink lg:text-[38px]">
            Publication keys & uploads.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Manage CLI access tokens, review your enrolled Ed25519 identity and publish signed
            assets through the browser without leaving the shared session.
          </p>
        </div>
        <div className="rounded-md border border-kernel/30 bg-kernel/5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-kernel">
          {validation ? "Token validation live" : "Session active"}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-threat/30 bg-threat/10 px-4 py-3 text-[12.5px] text-threat">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-md border border-kernel/30 bg-kernel/10 px-4 py-3 text-[12.5px] text-kernel">
          {notice}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-md border border-hairline bg-panel p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                Author identity
              </p>
              <h2 className="mt-2 font-display text-[20px] font-bold text-ink">
                {session.name || session.email}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-muted">{session.email}</p>
            </div>
            <Badge variant="kernel">{session.role}</Badge>
          </div>

          <div className="mt-4 rounded-md border border-hairline bg-void/50 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
                Enrolled Ed25519 public key
              </p>
              <Badge variant={publicKey ? "kernel" : "telemetry"}>
                {publicKey ? "Locked to account" : "Enrollment pending"}
              </Badge>
            </div>
            <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-ink">
              {publicKey || "No public asset has been published with this identity yet. Your key is enrolled automatically on the first signed publish."}
            </code>
            {publicKey && <CopyButton text={publicKey} label="Copy key" className="mt-3" />}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">API scopes</p>
              <p className="mt-1 font-mono text-[11px] text-ink">
                {publishScopes.length > 0 ? publishScopes.join(" · ") : "JWT developer"}
              </p>
            </div>
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Upload quota</p>
              <p className="mt-1 font-mono text-[11px] text-ink">
                {validation
                  ? `${(validation.quota.max_upload_bytes / 1024 / 1024).toFixed(0)} MB / file`
                  : "—"}
              </p>
            </div>
            <div className="rounded border border-hairline bg-void/40 px-3 py-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Token state</p>
              <p className="mt-1 font-mono text-[11px] text-kernel">
                {validation?.valid ? "Verified" : token ? "Session JWT" : "Read-only"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-hairline bg-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                CLI access tokens
              </p>
              <h2 className="mt-1 font-display text-[18px] font-bold text-ink">
                {tokens.filter((t) => !t.revoked).length} active
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-md bg-cyan px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
            >
              + New token
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr>
                  {["Name", "Prefix", "Created", "Expires", "Scopes", ""].map((h) => (
                    <th
                      key={h}
                      className="border-b border-hairline px-2 py-2 text-left font-mono text-[9px] uppercase tracking-[0.14em] text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-5 font-mono text-[11px] text-muted">
                      No CLI tokens yet. Create one for CI/CD or the `aryo` CLI.
                    </td>
                  </tr>
                ) : (
                  tokens.map((row) => (
                    <tr key={row.token_id} className={row.revoked ? "opacity-45" : ""}>
                      <td className="border-b border-hairline/60 px-2 py-2.5 text-[11.5px] text-ink">
                        {row.name}
                      </td>
                      <td className="border-b border-hairline/60 px-2 py-2.5 font-mono text-[10px] text-muted">
                        {row.key_prefix}…
                      </td>
                      <td className="border-b border-hairline/60 px-2 py-2.5 font-mono text-[10px] text-muted">
                        {dateLabel(row.created_at)}
                      </td>
                      <td className="border-b border-hairline/60 px-2 py-2.5 font-mono text-[10px] text-muted">
                        {dateLabel(row.expires_at)}
                      </td>
                      <td className="border-b border-hairline/60 px-2 py-2.5 font-mono text-[9.5px] text-cyan">
                        {row.scopes.join(", ")}
                      </td>
                      <td className="border-b border-hairline/60 px-2 py-2.5 text-right">
                        {row.revoked ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
                            revoked
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void revokeToken(row)}
                            disabled={revoking === row.token_id}
                            className="font-mono text-[9px] uppercase tracking-[0.1em] text-threat hover:underline disabled:opacity-50"
                          >
                            {revoking === row.token_id ? "…" : "Revoke"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {newSecret && (
        <section className="mt-4 rounded-md border border-kernel/40 bg-kernel/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-kernel">
                Token created — one-time secret
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                Copy this key now. It will not be shown again.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-hairline bg-void px-3 py-2.5">
            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-kernel">
              {newSecret.api_key}
            </code>
            <CopyButton text={newSecret.api_key} label="Copy secret" />
          </div>
        </section>
      )}

      <section className="mt-5 rounded-md border border-hairline bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Web upload intake
            </p>
            <h2 className="mt-1 font-display text-[20px] font-bold text-ink">
              Publish a signed asset.
            </h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-muted">
              Alternative to the CLI. The file bytes are verified against your enrolled key before
              the asset enters the public catalog.
            </p>
          </div>
          <Badge variant="cyan">{uploadType}</Badge>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <label className="block">
              <span className={labelCls}>Asset type</span>
              <select
                value={uploadType}
                onChange={(e) => {
                  setUploadType(e.target.value as UploadType);
                  setLintMessage(null);
                }}
                className={inputCls}
              >
                {UPLOAD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Signed artifact file</span>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[11px] text-muted file:mr-3 file:rounded file:border-0 file:bg-cyan/10 file:px-2.5 file:py-1.5 file:font-mono file:text-[10px] file:uppercase file:tracking-[0.1em] file:text-cyan"
              />
              {uploadFile && (
                <span className="mt-1 block font-mono text-[10px] text-muted">
                  {uploadFile.name} · {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              )}
            </label>
            <label className="block">
              <span className={labelCls}>Ed25519 signature (hex)</span>
              <textarea
                value={signatureText}
                onChange={(e) => setSignatureText(e.target.value)}
                rows={3}
                spellCheck={false}
                placeholder="64-byte signature, optional 0x prefix"
                className={`${inputCls} font-mono text-[11px]`}
              />
            </label>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className={labelCls}>
                {uploadType === "blueprint" ? "Blueprint manifest JSON" : "Manifest JSON"}
              </span>
              <textarea
                value={manifestText}
                onChange={(e) => setManifestText(e.target.value)}
                rows={10}
                spellCheck={false}
                placeholder={
                  uploadType === "blueprint"
                    ? `{\n  "slug": "my-blueprint",\n  "name": "My production blueprint",\n  "version": "1.0.0",\n  "target_site": "Substation A",\n  "industry": "energy",\n  "target_architecture": "x86_64",\n  "author_public_key": "…"\n}`
                    : `{\n  "slug": "my-asset",\n  "name": "My Asset",\n  "version": "1.0.0",\n  "author_public_key": "…"\n}`
                }
                className={`${inputCls} font-mono text-[11px] leading-relaxed`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={validateManifest}
                disabled={!manifestText.trim()}
                className="rounded-md border border-cyan/50 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10 disabled:opacity-40"
              >
                Pre-flight validate
              </button>
              <button
                type="button"
                onClick={() => void publish()}
                disabled={publishing}
                className="rounded-md bg-cyan px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110 disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish signed asset"}
              </button>
              <span className="font-mono text-[9.5px] text-muted">
                requires {uploadType === "blueprint" ? "packages:publish" : publishScopes.includes("packages:publish") ? "packages:publish" : "developer JWT"}
              </span>
            </div>
            {lintMessage && (
              <p
                className={`rounded border px-3 py-2 text-[11.5px] ${
                  lintMessage.startsWith("Pre-flight passed")
                    ? "border-kernel/30 bg-kernel/5 text-kernel"
                    : "border-telemetry/30 bg-telemetry/5 text-telemetry"
                }`}
              >
                {lintMessage}
              </p>
            )}
            {publishError && (
              <p className="rounded border border-threat/30 bg-threat/5 px-3 py-2 text-[11.5px] text-threat">
                {publishError}
              </p>
            )}
            {publishResult && (
              <div className="rounded border border-kernel/30 bg-kernel/5 px-3 py-2.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-kernel">
                  Published · {publishResult.slug}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="cyan">{publishResult.asset_type}</Badge>
                  {publishResult.version && <Badge variant="muted">v{publishResult.version}</Badge>}
                  <Link
                    href={`/assets/${publishResult.asset_type}/${publishResult.slug}`}
                    className="font-mono text-[10px] uppercase tracking-[0.1em] text-cyan hover:underline"
                  >
                    Inspect asset →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 p-4">
          <div className="w-full max-w-md rounded-md border border-hairline bg-panel p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
                  Create token
                </p>
                <h3 className="mt-1 font-display text-[19px] font-bold text-ink">
                  New CLI access token
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="font-mono text-[11px] text-muted hover:text-ink"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className={labelCls}>Token description / name</span>
                <input
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. GitHub Actions production"
                  className={inputCls}
                />
              </label>
              <div>
                <span className={labelCls}>Scopes</span>
                <div className="space-y-2">
                  {SCOPES.map((scope) => (
                    <label
                      key={scope}
                      className="flex cursor-pointer items-center gap-2 rounded border border-hairline bg-void/40 px-3 py-2 font-mono text-[11px] text-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope)}
                        onChange={(e) =>
                          setSelectedScopes((current) =>
                            e.target.checked
                              ? [...current, scope]
                              : current.filter((value) => value !== scope)
                          )
                        }
                        className="accent-cyan"
                      />
                      {scope}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className={labelCls}>Expiration</span>
                <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={inputCls}>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="never">Never</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-hairline px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void createToken()}
                disabled={creating}
                className="rounded-md bg-cyan px-3.5 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110 disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create token"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4 font-mono text-[10px] text-muted">
        <span>
          CLI: <code className="text-cyan">aryo login</code> · <code className="text-cyan">aryo publish</code>
        </span>
        <span>All publication actions are recorded in the signed audit log.</span>
      </div>
    </div>
  );
}
