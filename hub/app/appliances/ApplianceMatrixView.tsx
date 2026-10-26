"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import CopyButton from "@/components/ui/CopyButton";
import { HUB_BACKEND_ORIGIN } from "@/lib/api";
import { bytes } from "@/lib/format";
import {
  appliances,
  type ApplianceArchitecture,
  type ApplianceIndustry,
  type ApplianceLicense,
  type ApplianceMatrix,
  type ApplianceRelease,
} from "@/lib/hub";

const FALLBACK_MATRIX: ApplianceMatrix = {
  latest_version: "2.5.0",
  supported_architectures: [
    {
      id: "x86_64-openvino",
      label: "Intel x86_64 (CPU / Iris Xe / NPU OpenVINO)",
      target_hardware: "INTEL_OPENVINO",
      recommended_for: "Standard IPCs, Advantech, Siemens Microbox",
    },
    {
      id: "aarch64-jetson",
      label: "NVIDIA Jetson (Orin / Xavier / CUDA TensorRT)",
      target_hardware: "NVIDIA_TENSORRT",
      recommended_for: "NVIDIA Jetson Edge Boxes, Smart Substations",
    },
    {
      id: "aarch64-rknn",
      label: "Rockchip ARM64 (RK3588 NPU)",
      target_hardware: "ROCKCHIP_RKNN",
      recommended_for: "Orange Pi 5, Low-Power Embedded Edge",
    },
    {
      id: "x86_64-generic",
      label: "Generic Linux x86_64 (No Hardware NPU)",
      target_hardware: "GENERIC_CPU",
      recommended_for: "VMware ESXi, KVM, Bare-Metal Servers",
    },
  ],
  supported_industries: [
    { id: "water", label: "Drinking Water & Wastewater Utilities", protocols: ["MODBUS", "PROFINET"] },
    { id: "energy", label: "Electrical Grid & Substations", protocols: ["IEC_104", "DNP3", "C37_118"] },
    { id: "5g_factory", label: "Smart Factory & Private 5G Core", protocols: ["GTP_U", "S7COMM", "PROFINET"] },
    { id: "chemical", label: "Chemical & Refining Safety (SIS)", protocols: ["TRISTATION", "MODBUS"] },
    { id: "aerospace", label: "Aerospace, UAV & Ground Stations", protocols: ["CCSDS", "STANAG_4586"] },
    { id: "general", label: "General Industrial CPS Defense", protocols: ["ALL_PROTOCOLS"] },
  ],
  supported_licenses: [
    { id: "community", label: "Community Evaluation (Free, 1 Node Limit)", node_limit: 1 },
    { id: "enterprise", label: "Enterprise Operational (Multi-Node Fleet Sync)", node_limit: 50 },
    { id: "sovereign", label: "Critical Sovereign (Air-Gapped, Unlimited Nodes)", node_limit: 0 },
  ],
};

function selectCls(): string {
  return "w-full rounded-md border border-hairline bg-void px-3 py-2.5 text-[12.5px] text-ink focus:border-cyan/60 focus:outline-none";
}

function pretty(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function downloadHref(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/api/")) return `${HUB_BACKEND_ORIGIN}${url}`;
  return `${HUB_BACKEND_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
}

function ReleaseCard({ release }: { release: ApplianceRelease }) {
  return (
    <div className="rounded-md border border-cyan/30 bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="kernel">✓ Authority Root verified</Badge>
            <Badge variant="cyan">{release.verified_health_checks} checks</Badge>
            <Badge variant="muted">v{release.version}</Badge>
          </div>
          <h2 className="mt-3 font-display text-[22px] font-bold text-ink">{release.title}</h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            {release.file_name} · {bytes(release.file_size_bytes)}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2">
          <a
            href={downloadHref(release.download_url)}
            className="rounded-md bg-cyan px-5 py-3 text-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110"
          >
            ↓ Download .aryopack
          </a>
          <Link
            href={`/assets/appliance/${release.slug}`}
            className="rounded-md border border-hairline px-4 py-2 text-center font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted hover:border-cyan/40 hover:text-cyan"
          >
            Inspect provenance →
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded border border-hairline bg-void/40 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Architecture</p>
          <p className="mt-1 font-mono text-[11px] text-ink">{pretty(release.architecture)}</p>
        </div>
        <div className="rounded border border-hairline bg-void/40 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">Industry profile</p>
          <p className="mt-1 font-mono text-[11px] text-ink">{pretty(release.industry)}</p>
        </div>
        <div className="rounded border border-hairline bg-void/40 px-3 py-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted">License tier</p>
          <p className="mt-1 font-mono text-[11px] text-ink">{pretty(release.license_tier)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-md border border-hairline bg-void/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted">
            SHA-256 checksum
          </p>
          <CopyButton text={release.sha256_checksum} label="Copy" />
        </div>
        <code className="mt-2 block break-all font-mono text-[11px] text-kernel">
          {release.sha256_checksum}
        </code>
      </div>

      <div className="mt-4 rounded-md border border-hairline bg-void/40 p-4">
        <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
          Air-gapped bootstrap installation
        </p>
        <ol className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-muted">
          <li>1. Transfer the image to the target host using a USB drive.</li>
          <li>
            2. Run{" "}
            <code className="rounded bg-void px-1.5 py-0.5 font-mono text-[11px] text-kernel">
              chmod +x {release.file_name}
            </code>
          </li>
          <li>
            3. Run{" "}
            <code className="rounded bg-void px-1.5 py-0.5 font-mono text-[11px] text-kernel">
              sudo ./{release.file_name}
            </code>
          </li>
        </ol>
        <p className="mt-3 font-mono text-[10px] text-muted">
          The installer verifies the embedded root signature before writing to disk. No cloud
          egress is used at any point.
        </p>
      </div>
    </div>
  );
}

export default function ApplianceMatrixView() {
  const [matrix, setMatrix] = useState<ApplianceMatrix>(FALLBACK_MATRIX);
  const [arch, setArch] = useState(FALLBACK_MATRIX.supported_architectures[0].id);
  const [industry, setIndustry] = useState(FALLBACK_MATRIX.supported_industries[0].id);
  const [license, setLicense] = useState(FALLBACK_MATRIX.supported_licenses[0].id);
  const [releases, setReleases] = useState<ApplianceRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    appliances
      .matrix()
      .then((data) => {
        if (cancelled) return;
        setMatrix(data);
        setLive(true);
        if (data.supported_architectures[0]) setArch(data.supported_architectures[0].id);
        if (data.supported_industries[0]) setIndustry(data.supported_industries[0].id);
        if (data.supported_licenses[0]) setLicense(data.supported_licenses[0].id);
      })
      .catch(() => {
        if (!cancelled) {
          setError("The official appliance catalog is unreachable; showing the standard matrix.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    appliances
      .list({ arch, industry, license })
      .then((result) => {
        if (!cancelled) {
          setReleases(result.releases || []);
          setLive(true);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReleases([]);
          setLive(false);
          setError(err instanceof Error ? err.message : "Could not load appliance releases.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [arch, industry, license]);

  const selectedArch = useMemo(
    () => matrix.supported_architectures.find((a) => a.id === arch),
    [matrix, arch]
  );
  const selectedIndustry = useMemo(
    () => matrix.supported_industries.find((i) => i.id === industry),
    [matrix, industry]
  );
  const selectedLicense = useMemo(
    () => matrix.supported_licenses.find((l) => l.id === license),
    [matrix, license]
  );

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-20 pt-24 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
            {"// Official Appliance Distribution"}
          </p>
          <h1 className="mt-2 font-display text-[32px] font-bold leading-tight text-ink lg:text-[40px]">
            Download the exact .aryopack.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            Select silicon, industry profile and license tier. Every image is signed by the
            Aryorithm Authority Root Key and built for air-gapped deployment with $0.00 cloud
            egress.
          </p>
        </div>
        <div className="rounded-md border border-kernel/30 bg-kernel/5 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-kernel">
          {live ? "Authority catalog live" : "Offline matrix"} · v{matrix.latest_version}
        </div>
      </div>

      <div className="mt-6 rounded-md border border-telemetry/30 bg-telemetry/5 px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-telemetry">
          Security notice
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
          .aryopack distributions are signed exclusively by the Aryorithm Authority Root Key.
          Verify the SHA-256 checksum and detached signature before installing on an air-gapped
          host. Community accounts cannot publish appliance images.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-telemetry/30 bg-telemetry/10 px-4 py-3 text-[12.5px] text-telemetry">
          {error}
        </div>
      )}

      <section className="mt-5 rounded-md border border-hairline bg-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink">
            3-axis matrix selector
          </p>
          <span className="font-mono text-[10px] text-muted">
            latest release line v{matrix.latest_version}
          </span>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
              Hardware silicon target
            </span>
            <select value={arch} onChange={(e) => setArch(e.target.value)} className={selectCls()}>
              {matrix.supported_architectures.map((item: ApplianceArchitecture) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block font-mono text-[10px] text-muted/80">
              {selectedArch?.recommended_for}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
              Industry profile
            </span>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className={selectCls()}
            >
              {matrix.supported_industries.map((item: ApplianceIndustry) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block font-mono text-[10px] text-muted/80">
              {selectedIndustry?.protocols.join(" · ")}
            </span>
          </label>
          <label className="block">
            <span className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted">
              License tier
            </span>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value)}
              className={selectCls()}
            >
              {matrix.supported_licenses.map((item: ApplianceLicense) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <span className="mt-1.5 block font-mono text-[10px] text-muted/80">
              {selectedLicense?.node_limit === 0
                ? "Unlimited air-gapped nodes"
                : `${selectedLicense?.node_limit ?? 1} node${selectedLicense?.node_limit === 1 ? "" : "s"}`}
            </span>
          </label>
        </div>
      </section>

      <section className="mt-5 space-y-4">
        {loading ? (
          <div className="rounded-md border border-hairline bg-panel p-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Resolving matching appliance build…
            </p>
          </div>
        ) : releases.length === 0 ? (
          <div className="rounded-md border border-dashed border-hairline bg-panel/60 p-10 text-center">
            <p className="font-display text-[18px] font-semibold text-ink">
              No published build for this exact matrix combination yet.
            </p>
            <p className="mx-auto mt-2 max-w-xl text-[12.5px] leading-relaxed text-muted">
              The selector is connected to the Authority catalog. Try a different architecture,
              industry or license tier, or check the release line again after the next signed
              build.
            </p>
            <Link
              href="/explore"
              className="mt-5 inline-flex rounded-md border border-cyan/50 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan hover:bg-cyan/10"
            >
              Browse other verified assets →
            </Link>
          </div>
        ) : (
          releases.map((release) => <ReleaseCard key={release.slug} release={release} />)
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-md border border-hairline bg-panel p-5 lg:col-span-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink">
            Air-gapped bootstrap sequence
          </p>
          <ol className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-muted">
            <li>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">01 / Transfer</span>
              <br />Copy the downloaded .aryopack to a USB drive and mount it on the target host.
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">02 / Verify</span>
              <br />Compare the on-disk SHA-256 with the checksum shown on this page before executing.
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">03 / Install</span>
              <br />
              <code className="font-mono text-[11px] text-kernel">chmod +x sentinel_*.aryopack</code>{" "}
              then{" "}
              <code className="font-mono text-[11px] text-kernel">sudo ./sentinel_*.aryopack</code>.
            </li>
            <li>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cyan">04 / Attest</span>
              <br />The embedded installer verifies the root signature, applies the TPM 2.0 quote and
              starts the local sentinel daemon without cloud access.
            </li>
          </ol>
        </div>
        <div className="rounded-md border border-hairline bg-panel p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            Verification chain
          </p>
          <div className="mt-3 space-y-2.5 font-mono text-[11px]">
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted">Root key</span>
              <span className="text-kernel">Aryorithm Authority</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted">Signature</span>
              <span className="text-kernel">Ed25519</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted">Health checks</span>
              <span className="text-kernel">21/21</span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted">Cloud egress</span>
              <span className="text-kernel">$0.00</span>
            </p>
          </div>
          <p className="mt-4 border-t border-hairline/70 pt-3 text-[11.5px] leading-relaxed text-muted">
            Need an air-gapped provenance bundle? Download the checksum and .sig file alongside
            the installer, then run <code className="font-mono text-[10.5px] text-cyan">aryo verify</code>{" "}
            on the isolated host.
          </p>
        </div>
      </section>
    </div>
  );
}
