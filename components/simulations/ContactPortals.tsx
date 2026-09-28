"use client";

import { useState } from "react";
import CopyButton from "@/components/ui/CopyButton";
import HardwareSizer from "@/components/simulations/HardwareSizer";
import {
  DEFENSE_CLASSIFICATIONS,
  DEFENSE_CLEARANCES,
  DEFENSE_FACILITIES,
  ENTERPRISE_ENVS,
  ENTERPRISE_FORMS,
  PGP_FINGERPRINT,
  PGP_KEY_BLOCK,
  DISCLOSURE_STEPS,
} from "@/data/contact";

function Handoff({ desk, subject, body, onReset }: { desk: string; subject: string; body: string; onReset: () => void }) {
  const href = `mailto:${desk}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <div className="rise-in mt-5 rounded-md border border-kernel/50 bg-kernel/[0.04] p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kernel">Submission Assembled — Static Handoff</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
        This site is fully static and holds no server, so it cannot receive or encrypt your submission itself. Your
        details have been assembled below for transmission over an out-of-band channel. For anything sensitive, encrypt
        to fingerprint {PGP_FINGERPRINT} before sending.
      </p>
      <pre className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-hairline bg-void p-4 font-mono text-[11px] leading-relaxed text-ink">
        {body}
      </pre>
      <div className="mt-4 flex flex-wrap gap-3">
        <a href={href} className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">
          [ Open Encrypted Mail Draft ]
        </a>
        <button type="button" onClick={onReset} className="rounded-md border border-hairline px-5 py-2.5 font-mono text-[11.5px] uppercase tracking-[0.1em] text-muted hover:text-ink">
          [ Edit Submission ]
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "mt-1 w-full rounded-md border border-hairline bg-void px-3 py-2.5 text-[13px] text-ink placeholder:text-muted/40 focus:border-cyan/60";
const labelCls = "font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted";
const errCls = "mt-1 font-mono text-[11px] text-threat";

export function EnterprisePortal() {
  const [f, setF] = useState({ org: "", name: "", email: "", sites: "", env: ENTERPRISE_ENVS[0], form: ENTERPRISE_FORMS[0], notes: "" });
  const [e, setE] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.org.trim()) errs.org = "Organisation is required.";
    if (!f.name.trim()) errs.name = "Contact name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = "A valid corporate email is required.";
    if (!f.sites.trim() || isNaN(parseInt(f.sites, 10)) || parseInt(f.sites, 10) < 1) errs.sites = "Enter the number of sites (min 1).";
    setE(errs);
    if (Object.keys(errs).length === 0) setDone(true);
  };

  const body = `ARYORITHM — ENTERPRISE POC INQUIRY\n\nOrganisation:      ${f.org}\nContact:           ${f.name}\nEmail:             ${f.email}\nDistributed sites: ${f.sites}\nEnvironment:       ${f.env}\nPreferred form:    ${f.form}\n\nRequirements:\n${f.notes || "(none supplied)"}`;

  if (done) return <Handoff desk="poc@aryorithm.com" subject={`Enterprise POC Inquiry — ${f.org}`} body={body} onReset={() => setDone(false)} />;

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
      <div><label className={labelCls} htmlFor="ent-org">Organisation</label><input id="ent-org" value={f.org} onChange={(ev) => set("org", ev.target.value)} className={inputCls} />{e.org && <p className={errCls}>{e.org}</p>}</div>
      <div><label className={labelCls} htmlFor="ent-name">Contact name</label><input id="ent-name" value={f.name} onChange={(ev) => set("name", ev.target.value)} className={inputCls} />{e.name && <p className={errCls}>{e.name}</p>}</div>
      <div><label className={labelCls} htmlFor="ent-email">Corporate email</label><input id="ent-email" value={f.email} onChange={(ev) => set("email", ev.target.value)} className={inputCls} />{e.email && <p className={errCls}>{e.email}</p>}</div>
      <div><label className={labelCls} htmlFor="ent-sites">Distributed sites</label><input id="ent-sites" value={f.sites} onChange={(ev) => set("sites", ev.target.value)} inputMode="numeric" className={inputCls} />{e.sites && <p className={errCls}>{e.sites}</p>}</div>
      <div><label className={labelCls} htmlFor="ent-env">Environment</label><select id="ent-env" value={f.env} onChange={(ev) => set("env", ev.target.value)} className={inputCls}>{ENTERPRISE_ENVS.map((o) => <option key={o}>{o}</option>)}</select></div>
      <div><label className={labelCls} htmlFor="ent-form">Preferred form factor</label><select id="ent-form" value={f.form} onChange={(ev) => set("form", ev.target.value)} className={inputCls}>{ENTERPRISE_FORMS.map((o) => <option key={o}>{o}</option>)}</select></div>
      <div className="sm:col-span-2"><label className={labelCls} htmlFor="ent-notes">Requirements</label><textarea id="ent-notes" value={f.notes} onChange={(ev) => set("notes", ev.target.value)} rows={4} className={inputCls} /></div>
      <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">[ Assemble POC Request ]</button></div>
    </form>
  );
}

export function DefensePortal() {
  const [f, setF] = useState({ agency: "", cage: "", duns: "", officer: "", email: "", clearance: DEFENSE_CLEARANCES[0], facility: DEFENSE_FACILITIES[0], classification: DEFENSE_CLASSIFICATIONS[0], requirement: "" });
  const [e, setE] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.agency.trim()) errs.agency = "Agency or prime contractor is required.";
    if (!/^[A-Za-z0-9]{5}$/.test(f.cage.trim())) errs.cage = "CAGE code is 5 alphanumeric characters.";
    if (f.duns.trim() && !/^\d{9}$/.test(f.duns.replace(/[-\s]/g, ""))) errs.duns = "DUNS is 9 digits.";
    if (!f.officer.trim()) errs.officer = "Contracting officer name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = "A valid official email is required.";
    setE(errs);
    if (Object.keys(errs).length === 0) setDone(true);
  };

  const body = `ARYORITHM — DEFENSE / GOVERNMENT PROCUREMENT REQUEST\n\nAgency / Prime:        ${f.agency}\nCAGE code:             ${f.cage.toUpperCase()}\nDUNS:                  ${f.duns || "(not supplied)"}\nContracting officer:   ${f.officer}\nOfficial email:        ${f.email}\nPersonnel clearance:   ${f.clearance}\nFacility security:     ${f.facility}\nData classification:   ${f.classification}\n\nDeployment requirement (UNCLASSIFIED SUMMARY ONLY):\n${f.requirement || "(none supplied)"}\n\n-- Transmit classified detail only over an approved channel. --`;

  if (done) return <Handoff desk="procurement@aryorithm.com" subject={`Defense Procurement — CAGE ${f.cage.toUpperCase()}`} body={body} onReset={() => setDone(false)} />;

  return (
    <form onSubmit={submit} noValidate className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2 rounded-md border border-telemetry/50 bg-telemetry/[0.05] px-4 py-3 font-mono text-[11px] leading-relaxed text-telemetry">
        Do not enter classified, CUI or export-controlled technical detail into this form. It runs entirely in your
        browser on a static site and offers no accreditation boundary. Submit an unclassified summary only; cleared
        detail follows over an approved channel.
      </div>
      <div><label className={labelCls} htmlFor="def-agency">Agency / prime contractor</label><input id="def-agency" value={f.agency} onChange={(ev) => set("agency", ev.target.value)} className={inputCls} />{e.agency && <p className={errCls}>{e.agency}</p>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelCls} htmlFor="def-cage">CAGE</label><input id="def-cage" value={f.cage} onChange={(ev) => set("cage", ev.target.value)} placeholder="5 chars" className={inputCls} />{e.cage && <p className={errCls}>{e.cage}</p>}</div>
        <div><label className={labelCls} htmlFor="def-duns">DUNS</label><input id="def-duns" value={f.duns} onChange={(ev) => set("duns", ev.target.value)} placeholder="9 digits" className={inputCls} />{e.duns && <p className={errCls}>{e.duns}</p>}</div>
      </div>
      <div><label className={labelCls} htmlFor="def-officer">Contracting officer</label><input id="def-officer" value={f.officer} onChange={(ev) => set("officer", ev.target.value)} className={inputCls} />{e.officer && <p className={errCls}>{e.officer}</p>}</div>
      <div><label className={labelCls} htmlFor="def-email">Official email</label><input id="def-email" value={f.email} onChange={(ev) => set("email", ev.target.value)} className={inputCls} />{e.email && <p className={errCls}>{e.email}</p>}</div>
      <div><label className={labelCls} htmlFor="def-clearance">Personnel clearance</label><select id="def-clearance" value={f.clearance} onChange={(ev) => set("clearance", ev.target.value)} className={inputCls}>{DEFENSE_CLEARANCES.map((o) => <option key={o}>{o}</option>)}</select></div>
      <div><label className={labelCls} htmlFor="def-facility">Facility security</label><select id="def-facility" value={f.facility} onChange={(ev) => set("facility", ev.target.value)} className={inputCls}>{DEFENSE_FACILITIES.map((o) => <option key={o}>{o}</option>)}</select></div>
      <div><label className={labelCls} htmlFor="def-class">Data classification</label><select id="def-class" value={f.classification} onChange={(ev) => set("classification", ev.target.value)} className={inputCls}>{DEFENSE_CLASSIFICATIONS.map((o) => <option key={o}>{o}</option>)}</select></div>
      <div className="sm:col-span-2"><label className={labelCls} htmlFor="def-req">Requirement (unclassified summary)</label><textarea id="def-req" value={f.requirement} onChange={(ev) => set("requirement", ev.target.value)} rows={4} className={inputCls} /></div>
      <div className="sm:col-span-2"><button type="submit" className="rounded-md bg-cyan px-5 py-2.5 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-void">[ Assemble Procurement Request ]</button></div>
    </form>
  );
}

export function PgpPanel() {
  return (
    <div id="pgp-panel" className="scroll-mt-24 rounded-md border border-hairline bg-panel p-6 lg:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Sovereign Cryptographic Communications"}</p>
      <h2 className="mt-2 font-display text-[22px] font-bold text-ink">Encrypt Before You Send.</h2>
      <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-muted">
        Vulnerability reports, deployment topologies and procurement detail should never cross the public internet in
        plaintext. Encrypt to the master security key below; we triage within 72 hours.
      </p>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-md border border-hairline bg-void p-5 font-mono text-[11px]">
          <p className="text-muted">pub ed25519/EE123409A1F86100 2026-03-15 [SC]</p>
          <p className="mt-1 text-muted">Key Type: ED25519 / 4096-bit RSA</p>
          <p className="mt-1 text-muted">UID: Aryorithm Technologies &lt;security@aryorithm.com&gt;</p>
          <p className="mt-1 text-muted">Lab: Amsterdam Research Facility, Netherlands</p>
          <p className="mt-1 text-muted">Triage SLA: 72 hours</p>
          <p className="tabular mt-3 break-all text-[12px] text-kernel">{PGP_FINGERPRINT}</p>
          <div className="mt-3 flex items-center gap-3">
            <CopyButton text={PGP_KEY_BLOCK} label="Copy Public PGP Key" copiedLabel="✓ Key In Clipboard" />
          </div>
          <pre className="mt-4 max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded border border-hairline bg-panel p-3 text-[9.5px] leading-relaxed text-muted">
            {PGP_KEY_BLOCK}
          </pre>
        </div>
        <ol className="space-y-3">
          {DISCLOSURE_STEPS.map((s, i) => (
            <li key={s} className="flex gap-3 rounded-md border border-hairline bg-void/50 px-4 py-3">
              <span className="font-mono text-[12px] text-cyan">0{i + 1}</span>
              <span className="text-[12.5px] leading-relaxed text-muted">{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function IntakePortals() {
  const [tab, setTab] = useState<"enterprise" | "defense" | "sizing">("enterprise");
  return (
    <section id="intake-portals" className="scroll-mt-24">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Three Dedicated Intake Portals"}</p>
      <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[28px]">Route Your Request To The Right Desk.</h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {([["enterprise", "Enterprise POC"], ["defense", "Defense & Government"], ["sizing", "Hardware Sizing"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`rounded-md border px-4 py-2 font-mono text-[11.5px] uppercase tracking-[0.1em] ${tab === id ? "border-cyan/60 text-cyan" : "border-hairline text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-md border border-hairline bg-panel p-6">
        {tab === "enterprise" && (
          <div id="portal-enterprise-panel">
            <p className="text-[13px] text-muted">Request evaluation hardware appliances for corporate networks and industrial OT sites. A field architect replies within two business days.</p>
            <EnterprisePortal />
          </div>
        )}
        {tab === "defense" && (
          <div id="portal-defense-panel">
            <p className="text-[13px] text-muted">Cleared intake accepting CAGE codes, DUNS numbers, classified deployment requirements and facility security levels. Routed to the defense desk.</p>
            <DefensePortal />
          </div>
        )}
        {tab === "sizing" && (
          <div id="portal-sizing-panel">
            <p className="mb-4 text-[13px] text-muted">Specify network throughput, target silicon backend and ambient thermal conditions. The selector resolves an indicative appliance recommendation.</p>
            <HardwareSizer />
          </div>
        )}
      </div>
    </section>
  );
}
