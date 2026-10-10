import type { Metadata } from "next";
import ManifestLinter from "@/components/hub/ManifestLinter";

export const metadata: Metadata = {
  title: "Publish Extensions | Aryorithm Hub",
  description:
    "Validate your splugin.yaml, sign your bundle, and publish signed extensions to the global registry.",
};

const CLI_STEPS: { title: string; commands: string[] }[] = [
  {
    title: "1. Build and pack archive",
    commands: ["sentinel-hub pack ./my-plugin"],
  },
  {
    title: "2. Sign with your Ed25519 key",
    commands: ["sentinel-hub sign my-plugin.splugin --key ~/.sentinel-hub/key.ed25519"],
  },
  {
    title: "3. Publish to the registry",
    commands: ["sentinel-hub publish my-plugin --api-key $HUB_API_KEY"],
  },
];

const TIERS: { name: string; color: string; needs: string[] }[] = [
  {
    name: "Community Verified",
    color: "#8A99AD",
    needs: ["Valid manifest + passing linter", "Working install on reference hardware", "Changelog for every release"],
  },
  {
    name: "Enterprise Audited",
    color: "#00E5FF",
    needs: ["Manual capability review", "Fuzz harness for native code", "Reproducible build attestation"],
  },
  {
    name: "Official Core",
    color: "#00FFA3",
    needs: ["Full security audit by Aryorithm", "Bit-for-bit reproducible builds", "TPM attestation profile"],
  },
];

export default function PublishPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-16 pt-24 lg:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">
        {"// Developer Extension Workbench"}
      </p>
      <h1 className="mt-2 max-w-3xl font-display text-[30px] font-bold leading-tight text-ink sm:text-[38px]">
        Package, validate, and publish signed extensions.
      </h1>
      <p className="mt-3 max-w-2xl text-[14.5px] leading-[1.75] text-muted">
        Lint your manifest below, sign your bundle with your enrolled Ed25519 key,
        and ship to the global ecosystem.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-hairline bg-panel p-6">
          <ManifestLinter />
        </div>
        <div className="space-y-6">
          <div className="rounded-md border border-hairline bg-panel p-6">
            <h2 className="font-display text-[15px] font-bold text-ink">Packaging & CLI Publish</h2>
            <div className="mt-4 space-y-4">
              {CLI_STEPS.map((s) => (
                <div key={s.title}>
                  <p className="font-mono text-[11px] text-muted">{s.title}</p>
                  {s.commands.map((c) => (
                    <div
                      key={c}
                      className="terminal-body mt-1.5 overflow-x-auto rounded-md border border-hairline px-3 py-2.5"
                    >
                      <code className="whitespace-nowrap font-mono text-[12px] text-ink">{c}</code>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-muted">
              Mint a CLI token with the <span className="font-mono text-[11px] text-cyan">packages:publish</span>{" "}
              scope and export it as <span className="font-mono text-[11px] text-cyan">HUB_API_KEY</span>.
              First publish enrolls your public key — every later upload must verify against it.
            </p>
          </div>
          <div className="rounded-md border border-hairline bg-panel p-6">
            <h2 className="font-display text-[15px] font-bold text-ink">Developer Resources</h2>
            <ul className="mt-3 space-y-2 text-[13px]">
              {[
                "Download C++20 Header SDK",
                "Wasmtime Sandboxing Guide",
                "Manifest Specification (splugin.yaml)",
              ].map((r) => (
                <li key={r}>
                  <a href="/docs" className="link-underline text-muted transition-colors hover:text-cyan">
                    {r} →
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md border border-hairline bg-panel p-6">
        <h2 className="font-display text-[17px] font-bold text-ink">Verification Tier Guidelines</h2>
        <p className="mt-1 text-[13px] text-muted">
          What it takes to advance from Community to Enterprise Audited to Official Core.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className="rounded-md border border-hairline bg-void p-5">
              <h3 className="font-display text-[14px] font-bold" style={{ color: t.color }}>
                {t.name}
              </h3>
              <ul className="mt-3 space-y-2">
                {t.needs.map((n) => (
                  <li key={n} className="flex gap-2 text-[12.5px] text-muted">
                    <span className="text-cyan">✓</span>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
