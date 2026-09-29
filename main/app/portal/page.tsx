"use client";

import { useState } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import LicenseGenerator from "@/components/simulations/LicenseGenerator";
import { Fido2Panel, SamlPanel, TpmPanel } from "@/components/simulations/PortalAuth";
import { AUTH_METHODS } from "@/data/portal";

export default function PortalPage() {
  const [tab, setTab] = useState<"auth" | "license">("auth");
  const [method, setMethod] = useState("auth-fido2");

  return (
    <>
      <section id="portal-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Customer Enclave" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Sovereign Enclave Access <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Customer Enclave Authentication &amp; Activation.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Hardware-bound operator access and offline license issuance for disconnected nodes. No third-party identity
            broker ever sees your operators, and no appliance needs an internet route to be licensed.
          </p>
          <div className="mt-6 rounded-md border border-telemetry/50 bg-telemetry/[0.05] px-4 py-3 font-mono text-[11px] leading-relaxed text-telemetry">
            INTERFACE DEMONSTRATION. This public page is static and has no server or identity provider behind it — it
            cannot authenticate anyone, and it accepts no real credential. The production enclave runs on your own
            appliance at https://&lt;node&gt;:9443. Never enter a live credential here.
          </div>
          <div className="mt-4 rounded-md border border-cyan/40 bg-void px-4 py-3 font-mono text-[11px] text-cyan">
            [ AIR-GAPPED PROTOCOL: ZERO THIRD-PARTY COOKIES / NO EXTERNAL OAUTH ] — the enclave sets no analytics
            cookie, loads no external script, and brokers no login through a social or cloud OAuth provider.
            Authentication terminates on hardware you physically control.
          </div>
        </div>
      </section>

      <section id="portal-container" className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-12 lg:px-8">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setTab("auth")} aria-pressed={tab === "auth"} className={`rounded-md border px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] ${tab === "auth" ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
            Sovereign Authentication
          </button>
          <button type="button" onClick={() => setTab("license")} aria-pressed={tab === "license"} className={`rounded-md border px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] ${tab === "license" ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}>
            Air-Gapped License Activation
          </button>
        </div>

        <div className="mt-5">
          {tab === "auth" && (
            <div id="tab-auth-panel" className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <div className="space-y-2">
                {AUTH_METHODS.map((m) => (
                  <button
                    key={m.id}
                    id={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    aria-pressed={method === m.id}
                    className={`block w-full rounded-md border px-4 py-3 text-left ${method === m.id ? "border-cyan/60 bg-cyan/[0.05]" : "border-hairline bg-panel"}`}
                  >
                    <span className="font-mono text-[10px] text-muted">{m.n}</span>
                    <span className="block text-[13.5px] font-medium text-ink">{m.label}</span>
                    <span className="block font-mono text-[10px] text-muted">{m.sub}</span>
                  </button>
                ))}
                <Link href="/contact#pgp-panel" className="block text-center font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted hover:text-cyan">
                  Lost hardware? → recovery via PGP channel
                </Link>
              </div>
              <div>
                {method === "auth-fido2" && <Fido2Panel />}
                {method === "auth-tpm" && <TpmPanel />}
                {method === "auth-saml" && <SamlPanel />}
              </div>
            </div>
          )}
          {tab === "license" && (
            <div id="tab-license-panel"><LicenseGenerator /></div>
          )}
        </div>
      </section>
    </>
  );
}
