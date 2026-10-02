import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Blackbox Sentinel — Tier 3 Cyber-Physical XDR Appliance | Aryorithm",
  description: "The flagship edge appliance for sovereign cyber-physical defense. 26 subsystems, 30 industrial protocol dissectors, eBPF/XDP fast-path mitigation.",
};

const SUBSYSTEMS = [
  { name: "XDP Fast-Path", desc: "Kernel-level packet inspection and mitigation at 0.84µs worst-case latency." },
  { name: "Protocol Dissectors", desc: "30 dlopen plugins for Modbus, DNP3, IEC 61850, S7comm, Profinet, and more." },
  { name: "Physical Constraint Engine", desc: "Validates commands against mechanical reality, not just packet syntax." },
  { name: "Evidence Carving", desc: "PCAP, flow records, and alert metadata export in standard formats." },
  { name: "Local Management UI", desc: "Air-gapped web interface — no external CDN, no cloud tenancy." },
  { name: "OTA Update Client", desc: "Signed firmware updates via USB or canary pipeline." },
  { name: "Attestation Agent", desc: "TPM 2.0 identity proof and PCR-based attestation." },
  { name: "Fleet Sync", desc: "Peer-to-peer threat correlation with other Sentinel appliances." },
];

const FORM_FACTORS = [
  { model: "S-1000", desc: "Compact 1U rack-mount for edge deployments", specs: "8 cores, 32 GB RAM, 2×10GbE" },
  { model: "S-5000", desc: "Full 2U rack-mount with all 26 subsystems", specs: "16 cores, 64 GB RAM, 4×25GbE" },
  { model: "V-Edge", desc: "Virtual appliance for cloud-adjacent environments", specs: "KVM/QEMU, 4 vCPU, 8 GB RAM" },
  { model: "R-Sub", desc: "Ruggedized DIN-rail for substation environments", specs: "ARM64, 16 GB RAM, -40°C to +70°C" },
];

export default function BlackboxSentinelPage() {
  return (
    <>
      <section id="hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Projects" }, { label: "Blackbox Sentinel" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> Tier 3 Cyber-Physical XDR <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Blackbox Sentinel
          </h1>
          <p className="mt-2 font-mono text-[13px] text-cyan">Tier 3 Cyber-Physical XDR Appliance</p>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The flagship edge appliance for sovereign cyber-physical defense. Ships with 26 subsystems, 30 industrial
            protocol dissectors, and the full eBPF/XDP fast-path mitigation engine. Deployed in 2,400+ critical
            infrastructure sites across 14 countries.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products/sentinel" className="rounded-md bg-cyan px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-void hover:brightness-110">
              [ View Product Details ]
            </Link>
            <Link href="/docs" className="rounded-md border border-hairline px-6 py-3 font-mono text-[12px] uppercase tracking-[0.1em] text-ink hover:border-cyan/60 hover:text-cyan">
              [ Documentation ]
            </Link>
          </div>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Version", "v4.2.1"], ["Subsystems", "26"], ["Protocols", "30"], ["Deployments", "2,400+"]]} />
          </div>
        </div>
      </section>

      <section id="overview" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Overview"}</p>
            <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">What Is Blackbox Sentinel?</h2>
            <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
              <p>
                Blackbox Sentinel is a purpose-built edge appliance that provides deterministic, sub-millisecond active
                defense for critical infrastructure. It operates entirely within the air-gapped enclave — no cloud
                connectivity, no external dependencies, no data egress.
              </p>
              <p>
                The appliance integrates kernel-level packet inspection (eBPF/XDP), industrial protocol dissection,
                physical constraint validation, and local AI inference into a single, cohesive defense system. Every
                component is designed to fail closed: if any subsystem is compromised or unavailable, the appliance
                continues to enforce its security posture.
              </p>
              <p>
                Unlike traditional SIEMs that generate alerts for human analysts, Blackbox Sentinel takes autonomous
                action. When it detects a threat, it mitigates at the kernel level in under one microsecond — before the
                packet reaches the TCP/IP stack, before the application layer, before any actuator can respond.
              </p>
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "On This Page",
                items: [
                  { label: "Overview", href: "#overview" },
                  { label: "Subsystem Matrix", href: "#subsystems" },
                  { label: "Form Factors", href: "#form-factors" },
                  { label: "Fast-Path Mitigation", href: "#fast-path" },
                  { label: "Protocol Coverage", href: "#protocols" },
                  { label: "Deployment", href: "#deployment" },
                  { label: "Compliance", href: "#compliance" },
                ],
              },
              {
                heading: "Related Projects",
                items: [
                  { label: "Sentinel Nexus", href: "/projects/sentinel-nexus", meta: "v3.1.0" },
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Blackbox Core", href: "/projects/blackbox-core", meta: "v2.8.3" },
                ],
              },
            ]}
            cta={{ label: "Request Defense POC", href: "/contact" }}
          />
        </div>
      </section>

      <section id="subsystems" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Subsystem Matrix"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">26 Subsystems, One Appliance.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Each subsystem is a decoupled native module with its own versioning, testing, and update cycle. This
          architecture allows individual subsystems to be updated without rebooting the appliance.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSYSTEMS.map((s) => (
            <div key={s.name} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{s.name}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="form-factors" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Form Factors"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Four Form Factors.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FORM_FACTORS.map((f) => (
            <div key={f.model} className="rounded-md border border-hairline bg-panel p-6">
              <h3 className="font-display text-[16px] font-bold text-cyan">{f.model}</h3>
              <p className="mt-1 text-[13px] text-muted">{f.desc}</p>
              <p className="mt-3 font-mono text-[11px] text-ink">{f.specs}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="fast-path" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Fast-Path Mitigation"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">0.84 Microseconds. That Is The Budget.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            When a weaponized exploit targets a physical turbine, an electrical grid substation, or an airborne
            avionics datalink, cloud-bound SIEMs taking 15 to 60 seconds to index logs are generating autopsies, not
            defense.
          </p>
          <p>
            Blackbox Sentinel's fast-path mitigation engine operates at the XDP (eXpress Data Path) layer — the
            earliest possible point in the Linux kernel networking stack. Frames are inspected and dropped before they
            reach the TCP/IP stack, before socket buffers are allocated, before any userspace process is involved.
          </p>
          <p>
            The worst-case drop latency is 0.84 microseconds. This is not an average — it is a hard upper bound,
            verified across kernel versions 5.15 through 6.11. The physical constraint engine adds negligible
            overhead: constraint map lookups are O(1) hash table operations that complete in nanoseconds.
          </p>
          <p>
            This deterministic latency is the foundation of everything Blackbox Sentinel does. It means the appliance
            can guarantee that a malicious frame will never reach the application layer — not most of the time, not
            on average, but every single time.
          </p>
        </div>
      </section>

      <section id="protocols" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Protocol Coverage"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">30 Industrial Protocols.</h2>
        <p className="mt-2 max-w-2xl text-[14px] text-muted">
          Each protocol dissector is a dynamically loaded plugin (dlopen) that can be updated independently of the
          appliance firmware. New protocols can be added without a full system update.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Modbus TCP", "Modbus RTU", "DNP3", "IEC 61850", "S7comm", "Profinet", "EtherNet/IP", "OPC UA", "BACnet", "IEC 60870-5-104", "GOOSE", "MMS", "DNP3 Secure Auth", "Modbus Security", "OPC DA", "S7comm Plus", "Profinet IRT", "EtherCAT", "PowerLink", "SERCOS III", "CC-Link", "DeviceNet", "ControlNet", "HART", "Foundation Fieldbus", "AS-i", "Interbus", "CANopen", "Sinec H1", "IEC 101", "IEC 104"].map((p) => (
            <span key={p} className="rounded border border-hairline px-2.5 py-1 font-mono text-[10px] text-muted">{p}</span>
          ))}
        </div>
      </section>

      <section id="deployment" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Deployment"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">10 Business Days To Live.</h2>
        <div className="mt-6 max-w-3xl space-y-4 text-[14.5px] leading-[1.85] text-muted">
          <p>
            Standard deployment follows a 10-business-day timeline from POC request to live appliance. This includes
            hardware shipping, air-gapped installation, protocol dissector configuration, and operator training.
          </p>
          <p>
            The appliance is designed for deployment by field engineers — not site visits from consultants. The
            initial configuration wizard guides the operator through network interface setup, protocol selection,
            and constraint map activation. Most deployments are fully operational within 4 hours of physical
            installation.
          </p>
          <p>
            For complex multi-site deployments, the Sentinel Nexus orchestration plane provides centralized
            management, fleet-wide policy distribution, and cross-appliance threat correlation.
          </p>
        </div>
      </section>

      <section id="compliance" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Compliance"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Certified & Verified.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { cert: "IEC 62443-3-3 SL2", desc: "Industrial control system security" },
            { cert: "CMMC 2.0", desc: "Cybersecurity Maturity Model Certification" },
            { cert: "NIST SP 800-171", desc: "Protecting controlled unclassified information" },
            { cert: "NIS2 Directive", desc: "EU network and information security" },
            { cert: "FIPS 140-3", desc: "Cryptographic module validation" },
            { cert: "MIL-STD-461G", desc: "Electromagnetic interference" },
          ].map((c) => (
            <div key={c.cert} className="rounded-md border border-hairline bg-panel p-5">
              <h3 className="font-display text-[14px] font-bold text-ink">{c.cert}</h3>
              <p className="mt-1 text-[12.5px] text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
