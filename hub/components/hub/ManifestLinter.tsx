"use client";

import { useState } from "react";
import { hub, type LintResult } from "@/lib/hub";
import { ApiError } from "@/lib/api";

const SAMPLE = `schema_version: "1.0.0"
metadata:
  id: "vendor/custom-dissector"
  version: "1.0.0"
  title: "Custom Dissector"
runtime:
  type: WASM_SANDBOX
network:
  default_ports: [502]
silicon:
  supported: [UNIVERSAL]
`;

/** Interactive manifest linter workstation (§2.4, step 1). */
export default function ManifestLinter() {
  const [text, setText] = useState(SAMPLE);
  const [result, setResult] = useState<LintResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setError(null);
    setResult(null);
    setChecking(true);
    try {
      const res = await hub.validate(text);
      setResult(res);
    } catch (e) {
      // The linter endpoint answers 422 with the same contract shape.
      if (e instanceof ApiError && typeof e.details === "object" && e.details !== null) {
        const d = e.details as { errors?: LintResult["warnings"] };
        if (Array.isArray(d.errors)) {
          setResult({ valid: false, warnings: [], errors: d.errors, parsed_metadata: {} });
          return;
        }
      }
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-[15px] font-bold text-ink">Interactive Manifest Linter</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="rounded-md border border-hairline px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-cyan"
          >
            Reset sample
          </button>
          <button
            type="button"
            onClick={check}
            disabled={checking}
            className="rounded-md bg-cyan px-4 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-void transition-all hover:brightness-110 disabled:opacity-50"
          >
            {checking ? "Linting…" : "[ Validate ]"}
          </button>
        </div>
      </div>
      <p className="mt-1 text-[12.5px] text-muted">
        Paste your splugin.yaml to validate schema, ports, permissions, and version syntax.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        rows={14}
        className="terminal-body mt-3 w-full rounded-md border border-hairline bg-void p-4 font-mono text-[12px] leading-[1.7] text-ink placeholder:text-muted/50 focus:border-cyan/60 focus:outline-none"
        placeholder='schema_version: "1.0.0" ...'
      />
      <div className="mt-3" aria-live="polite">
        {error && (
          <p className="rounded-md border border-threat/40 bg-threat/[0.06] px-4 py-3 font-mono text-[11.5px] text-threat">
            {error}
          </p>
        )}
        {result && (
          <div className="rounded-md border border-hairline bg-void px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
              Linter audit output
            </p>
            {result.valid ? (
              <p className="mt-2 font-mono text-[12px] text-kernel">[✓] Metadata Schema: Valid</p>
            ) : (
              <p className="mt-2 font-mono text-[12px] text-threat">[✗] Metadata Schema: Invalid</p>
            )}
            <ul className="mt-2 space-y-1.5">
              {(result.warnings || []).map((w, i) => (
                <li key={`w${i}`} className="font-mono text-[11.5px] text-telemetry">
                  [!] {w.code ? `${w.code}: ` : ""}
                  {w.message}
                </li>
              ))}
              {(result.errors || []).map((e, i) => (
                <li key={`e${i}`} className="font-mono text-[11.5px] text-threat">
                  [✗] {e.field ? `${e.field}: ` : ""}
                  {e.message}
                </li>
              ))}
            </ul>
            {result.parsed_metadata && Object.keys(result.parsed_metadata).length > 0 && (
              <p className="mt-2 font-mono text-[11px] text-muted">
                Parsed:{" "}
                <span className="text-ink">
                  {result.parsed_metadata.id} · v{result.parsed_metadata.version} ·{" "}
                  {result.parsed_metadata.runtime}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
