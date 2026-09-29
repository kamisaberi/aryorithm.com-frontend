"use client";

import { useEffect, useRef, useState } from "react";
import { MTLS_STEPS } from "@/data/portal";

export function Fido2Panel() {
  const [stage, setStage] = useState<"idle" | "waiting" | "touched" | "done">("idle");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const begin = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setStage("waiting");
    timers.current.push(window.setTimeout(() => setStage("touched"), 1400));
    timers.current.push(window.setTimeout(() => setStage("done"), 2400));
  };
  const text =
    stage === "idle"
      ? "Authenticator not engaged — insert a hardware security key."
      : stage === "waiting"
        ? "Touch your security key… YubiKey 5 NFC detected, awaiting presence."
        : stage === "touched"
          ? "Presence confirmed — signing challenge (ES256)…"
          : "Assertion verified — credential ID matched, session bound.";
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">FIDO2 / WebAuthn</p>
      <p className={`mt-2 font-mono text-[11.5px] ${stage === "done" ? "text-kernel" : "text-muted"}`}>{text}</p>
      {stage === "done" && (
        <dl className="mt-3 grid gap-2 font-mono text-[10.5px] sm:grid-cols-3">
          {[["Attestation", "packed / ES256"], ["Transport", "USB-HID"], ["User presence", "verified"]].map(([k, v]) => (
            <div key={k} className="rounded border border-hairline px-3 py-2"><dt className="text-muted">{k}</dt><dd className="text-kernel">{v}</dd></div>
          ))}
        </dl>
      )}
      <button type="button" onClick={begin} disabled={stage === "waiting" || stage === "touched"} className="mt-4 rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40">
        {stage === "done" ? "[ Re-Authenticate ]" : "[ Begin FIDO2 Ceremony ]"}
      </button>
    </div>
  );
}

export function TpmPanel() {
  const [step, setStep] = useState(-1);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const run = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setStep(0);
    MTLS_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.current.push(window.setTimeout(() => setStep(i), 420 * i + 200));
    });
  };
  const done = step >= MTLS_STEPS.length - 1;
  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">TPM 2.0 Machine Certificate · mTLS</p>
      <ol className="mt-3 space-y-1.5 font-mono text-[11px]">
        {MTLS_STEPS.map(([k, v], i) => (
          <li key={k} className={step >= i ? "text-kernel" : "text-muted"}>
            {step >= i ? "✓" : "·"} {k} — {v}
          </li>
        ))}
      </ol>
      {done && <p className="mt-3 font-mono text-[11.5px] text-kernel">Channel established · operator session bound to hardware.</p>}
      <button type="button" onClick={run} disabled={step >= 0 && !done} className="mt-4 rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void disabled:opacity-40">
        {step < 0 ? "[ Present Machine Certificate ]" : done ? "[ Re-Run Handshake ]" : "[ Handshake Running… ]"}
      </button>
    </div>
  );
}

export function SamlPanel() {
  const [stage, setStage] = useState<"form" | "totp" | "done">("form");
  const [domain, setDomain] = useState("");
  const [idp, setIdp] = useState("Keycloak (self-hosted)");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submitDomain = () => {
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain.trim())) {
      setErr("Enter your organisation domain, e.g. northwind-utilities.com");
      return;
    }
    setErr(null);
    setStage("totp");
  };
  const submitTotp = () => {
    if (!/^\d{6}$/.test(totp)) {
      setErr("Hardware TOTP is a 6-digit code.");
      return;
    }
    setErr(null);
    setStage("done");
  };

  return (
    <div className="rounded-md border border-hairline bg-void/50 p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Enterprise SAML / SSO + Hardware TOTP</p>
      {stage === "form" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="saml-domain" className="font-mono text-[10.5px] text-muted">Organisation domain</label>
            <input id="saml-domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="northwind-utilities.com" className="mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink" />
          </div>
          <div>
            <label htmlFor="saml-idp" className="font-mono text-[10.5px] text-muted">Identity provider</label>
            <select id="saml-idp" value={idp} onChange={(e) => setIdp(e.target.value)} className="mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[12px] text-ink">
              {["Microsoft Entra ID", "Okta", "Ping Identity", "Keycloak (self-hosted)", "ADFS"].map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={submitDomain} className="rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void sm:col-span-2">
            [ Continue To Hardware TOTP ]
          </button>
        </div>
      )}
      {stage === "totp" && (
        <div className="mt-3">
          <label htmlFor="saml-totp" className="font-mono text-[10.5px] text-muted">Hardware TOTP (6 digits) via {idp}</label>
          <input id="saml-totp" value={totp} onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" placeholder="••••••" className="tabular mt-1 w-40 rounded-md border border-hairline bg-void px-3 py-2 font-mono text-[14px] tracking-[0.3em] text-ink" />
          <div><button type="button" onClick={submitTotp} className="mt-3 rounded-md bg-cyan px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-void">[ Verify TOTP ]</button></div>
        </div>
      )}
      {stage === "done" && (
        <p className="rise-in mt-3 rounded-md border border-kernel/50 bg-kernel/[0.05] px-4 py-3 font-mono text-[11.5px] text-kernel">
          Second factor accepted (demonstration). In production the enclave would now issue a short-lived,
          hardware-bound session. Nothing was verified here.
        </p>
      )}
      {err && <p role="alert" className="mt-2 font-mono text-[11px] text-threat">{err}</p>}
    </div>
  );
}
