"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Table from "@/components/ui/Table";
import { backend, type APIKey } from "@/lib/backend";
import { useAuth } from "@/lib/auth";
import { useBackend } from "@/hooks/useBackend";
import { DUMMY_API_KEYS } from "@/data/dummy";

export default function ApiKeysPage() {
  const { token } = useAuth();
  const { data: keys, live, refresh } = useBackend<APIKey[]>(
    DUMMY_API_KEYS,
    (tok: string) => backend.apiKeys(tok),
    token
  );
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed || !token || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await backend.createApiKey({ name: trimmed, scopes: [] }, token);
      setCreatedKey(res.api_key);
      setName("");
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string): Promise<void> => {
    if (!token || revokingId) return;
    setRevokingId(keyId);
    setError(null);
    try {
      await backend.revokeApiKey(keyId, token);
      refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to revoke API key");
    } finally {
      setRevokingId(null);
    }
  };

  const columns = [
    { key: "key_id", header: "Key ID", render: (k: APIKey) => (
      <span className="font-mono text-[11px] text-cyan">{k.key_id}</span>
    )},
    { key: "name", header: "Name", render: (k: APIKey) => (
      <span className="font-medium text-ink">{k.name}</span>
    )},
    { key: "created_at", header: "Created", render: (k: APIKey) => (
      <span className="font-mono text-[11px] text-muted">{k.created_at}</span>
    )},
    { key: "actions", header: "", render: (k: APIKey) => (
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => void handleRevoke(k.key_id)}
        >
          {revokingId === k.key_id ? "Revoking…" : "Revoke"}
        </Button>
      </div>
    ), className: "text-right" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description={`${keys.length} keys total`}
        breadcrumbs={[{ label: "Management" }, { label: "API Keys" }]}
        actions={
          <Badge variant={live ? "kernel" : "muted"}>
            {live ? "Live" : "Cached"}
          </Badge>
        }
      />

      <Card className="p-5">
        <h2 className="font-display text-[15px] font-semibold text-ink">Create API Key</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Key name (e.g. Production API)"
            className="admin-input flex-1"
          />
          <Button
            variant="primary"
            onClick={() => void handleCreate()}
          >
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
        {error && <p className="mt-3 text-[12px] text-threat">{error}</p>}
        {createdKey && (
          <div className="mt-4">
            <p className="text-[12px] text-threat">
              Copy this key now — it will not be shown again.
            </p>
            <p className="mt-2 break-all rounded border border-hairline bg-panel p-3 font-mono text-[12px] text-ink">
              {createdKey}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <Table columns={columns} data={keys} keyExtractor={(k) => k.key_id} />
      </Card>
    </div>
  );
}
