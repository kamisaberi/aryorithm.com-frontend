"use client";

import { type FormEvent, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import RequireAdmin from "@/components/layout/RequireAdmin";

interface AllowlistEntry {
  id: string;
  cidr: string;
  label: string;
}

const INITIAL_ENTRIES: AllowlistEntry[] = [
  { id: "allow-001", cidr: "203.0.113.0/24", label: "Corporate office" },
  { id: "allow-002", cidr: "198.51.100.42/32", label: "SOC jump host" },
  { id: "allow-003", cidr: "2001:db8::/32", label: "Partner network" },
];

function isValidNetwork(value: string): boolean {
  const [address, prefix] = value.split("/");
  if (!address || !/^[0-9a-fA-F:.]+$/.test(address)) return false;
  if (prefix !== undefined) {
    const bits = Number(prefix);
    if (!/^\d{1,3}$/.test(prefix) || bits < 0 || bits > 128) return false;
  }
  return true;
}

export default function IpAllowlistPage() {
  const [entries, setEntries] = useState<AllowlistEntry[]>(INITIAL_ENTRIES);
  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const network = cidr.trim();

    if (!network) {
      setError("Enter an IP address or CIDR range.");
      return;
    }
    if (!isValidNetwork(network)) {
      setError("Enter a valid IPv4 or IPv6 address or CIDR range.");
      return;
    }
    if (entries.some((entry) => entry.cidr === network)) {
      setError("That network is already on the allowlist.");
      return;
    }

    setEntries((current) => [
      ...current,
      {
        id: `allow-${Date.now()}`,
        cidr: network,
        label: label.trim() || "Unlabelled network",
      },
    ]);
    setCidr("");
    setLabel("");
    setError(null);
    setSaved(false);
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    setSaved(false);
  }

  return (
    <RequireAdmin>
      <div className="space-y-6">
        <PageHeader
          title="IP Allowlist"
          description="Restrict dashboard and API access to trusted networks."
          breadcrumbs={[
            { label: "System" },
            { label: "Settings", href: "/settings" },
            { label: "IP Allowlist" },
          ]}
          actions={<Button variant="secondary" href="/settings">Back to Settings</Button>}
        />

        {saved && (
          <div className="rounded-md border border-kernel/30 bg-kernel/5 p-4 text-[12.5px] text-kernel">
            IP allowlist saved in the cached console.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[15px] font-semibold text-ink">Allowed networks</h2>
                <p className="mt-1 text-[12.5px] text-muted">Traffic from any other address is denied.</p>
              </div>
              <Badge variant="cyan">{entries.length} entries</Badge>
            </div>

            <div className="mt-5 space-y-2">
              {entries.length === 0 ? (
                <p className="rounded-md border border-hairline bg-void/40 p-4 text-[12.5px] text-muted">
                  No networks are allowed. Add at least one entry before enabling enforcement.
                </p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-void/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-mono text-[12.5px] text-ink">{entry.cidr}</p>
                      <p className="mt-0.5 text-[11.5px] text-muted">{entry.label}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-threat"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={addEntry} className="mt-6 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label htmlFor="allowlist-cidr" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  IP or CIDR
                </label>
                <input
                  id="allowlist-cidr"
                  type="text"
                  value={cidr}
                  onChange={(event) => setCidr(event.target.value)}
                  placeholder="203.0.113.0/24"
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label htmlFor="allowlist-label" className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                  Label
                </label>
                <input
                  id="allowlist-label"
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Office network"
                  className="admin-input w-full"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full sm:w-auto">Add Network</Button>
              </div>
            </form>

            {error && <p className="mt-3 text-[12px] text-threat">{error}</p>}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-hairline pt-5">
              <Button variant="secondary" href="/settings">Cancel</Button>
              <Button onClick={() => setSaved(true)}>Save Allowlist</Button>
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="font-display text-[15px] font-semibold text-ink">Enforcement notes</h2>
              <ul className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-muted">
                <li>Include the network used by your SOC and on-call engineers before enabling enforcement.</li>
                <li>IPv6 ranges are supported alongside IPv4 ranges.</li>
                <li>Changes should be applied to the identity service and edge proxy together.</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-[15px] font-semibold text-ink">Safety check</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                Keep an out-of-band access path available before enforcing a new allowlist. A misconfigured range
                can lock administrators out of the dashboard.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
}
