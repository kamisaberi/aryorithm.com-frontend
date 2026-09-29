"use client";

import { useEffect, useRef, useState } from "react";
import CopyButton from "@/components/ui/CopyButton";
import { EXAMPLE_TOKEN, LICENSE_STEPS, buildLicenseEnvelope, isValidHardwareToken } from "@/data/portal";

type Stage = "input" | "generating" | "done";

export default function LicenseGenerator() {
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("input");
  const [progress, setProgress] = useState<string[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const envelope = stage === "done" ? buildLicenseEnvelope(token) : "";

  const generate = () => {
    const t = token.trim().toUpperCase();
    if (!isValidHardwareToken(t)) {
      setError("Expected format NODE-HW-XXXX-XXXX-XXXX as printed by --generate-hardware-token.");
      return;
    }
    setError(null);
    setToken(t);
    setStage("generating");
    setProgress([]);
    timers.current.forEach((x) => window.clearTimeout(x));
    timers.current = [];
    LICENSE_STEPS.forEach((step, i) => {
      timers.current.push(
        window.setTimeout(() => setProgress((p) => [...p, step]), 460 * (i + 1)),
      );
    });
    timers.current.push(window.setTimeout(() => setStage("done"), 460 * LICENSE_STEPS.length + 420));
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setStage("input");
    setProgress([]);
    setToken("");
    setError(null);
  };

  const download = () => {
    const blob = new Blob([envelope], { type: "application/octet-stream;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aryorithm-node.lic";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Air-Gapped License Activation"}</p>
      <h3 className="mt-2 font-display text-[20px] font-bold text-ink">Seal An Offline License Envelope.</h3>

      <div className="mt-4 rounded-md border border-hairline bg-void p-4 font-mono text-[11.5px] leading-relaxed">
        <p className="text-muted">operator@substation-north:~$ ./sentinel --generate-hardware-token</p>
        <p className="text-muted">reading /dev/tpmrm0 … OK</p>
        <p className="text-muted">reading /sys/class/dmi/id/product_uuid … OK</p>
        <p className="text-kernel">{EXAMPLE_TOKEN}</p>
      </div>

      {stage === "input" && (
        <div className="mt-5">
          <label htmlFor="license-token" className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">
            Hardware Token
          </label>
          <input
            id="license-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={EXAMPLE_TOKEN}
            spellCheck={false}
            className="tabular mt-2 w-full rounded-md border border-hairline bg-void px-3 py-2.5 font-mono text-[12.5px] text-ink placeholder:text-muted/40 focus:border-cyan/60"
          />
          {error && (
            <p role="alert" className="mt-2 font-mono text-[11.5px] text-threat">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={generate}
            className="mt-4 rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110"
          >
            [ Seal License Envelope ]
          </button>
        </div>
      )}

      {stage === "generating" && (
        <div className="mt-5 space-y-2 font-mono text-[11.5px]">
          {progress.map((p) => (
            <p key={p} className="text-kernel">
              ✓ {p}
            </p>
          ))}
          {progress.length < LICENSE_STEPS.length && <p className="text-muted">sealing…<span className="caret">▊</span></p>}
        </div>
      )}

      {stage === "done" && (
        <div className="rise-in mt-5">
          <div className="enclave-pulse rounded-md p-[1px]">
            <pre className="tabular whitespace-pre-wrap break-all rounded-md bg-void p-4 font-mono text-[10.5px] leading-relaxed text-kernel">
              {envelope}
            </pre>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <CopyButton text={envelope} label="Copy Envelope" copiedLabel="✓ Envelope Copied" />
            <button
              type="button"
              onClick={download}
              className="rounded-md border border-cyan/60 px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-cyan hover:bg-cyan/10"
            >
              Download .lic
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-hairline px-4 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-ink"
            >
              Start Over
            </button>
          </div>
          <p className="mt-4 font-mono text-[10.5px] leading-relaxed text-muted">
            Install: ./sentinel --apply-license aryorithm-node.lic — verifies ed25519 and refuses hardware mismatch.
            Demonstration artefact only — this envelope carries an illustrative signature and will not activate a real
            appliance.
          </p>
        </div>
      )}
    </div>
  );
}
