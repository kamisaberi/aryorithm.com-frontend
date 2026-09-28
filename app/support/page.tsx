import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";

export const metadata: Metadata = {
  title: "Support & Help Center | Aryorithm",
  description: "Get help with Aryorithm products. Technical support, troubleshooting, training, and customer resources.",
};

const SUPPORT_CHANNELS = [
  {
    title: "Technical Support",
    color: "#00E5FF",
    desc: "Get help with appliance deployment, configuration, and troubleshooting.",
    contact: "support@aryorithm.com",
    sla: "4-hour response for P1 incidents",
    icon: "⚡",
  },
  {
    title: "Field Engineering",
    color: "#00FFA3",
    desc: "On-site assistance for complex deployments and integrations.",
    contact: "field@aryorithm.com",
    sla: "48-hour dispatch for critical infrastructure",
    icon: "🔧",
  },
  {
    title: "Training & Enablement",
    color: "#FFB800",
    desc: "Certification programs for operators, administrators, and developers.",
    contact: "training@aryorithm.com",
    sla: "Next cohort starts monthly",
    icon: "📚",
  },
  {
    title: "Security Incident",
    color: "#FF3366",
    desc: "Report vulnerabilities or active security incidents affecting your deployment.",
    contact: "security@aryorithm.com",
    sla: "72-hour triage · PGP required",
    icon: "🛡️",
  },
];

const FAQS = [
  {
    q: "How do I update my appliance in an air-gapped environment?",
    a: "Use the OTA canary pipeline via a USB drive. Download the signed update package from the Customer Enclave Portal, transfer via USB, and apply through the local management interface. The update is verified against the appliance's TPM before installation.",
  },
  {
    q: "What kernel versions are supported?",
    a: "Blackbox Core supports Linux kernel 5.15 through 6.11. The verifier-compatibility suite is run against every kernel version in this range before any update is released. Custom kernel configurations are supported — contact field engineering.",
  },
  {
    q: "Can I integrate Blackbox Sentinel with my existing SIEM?",
    a: "Yes. The Evidence Carving API exports PCAP, flow records, and alert metadata in standard formats. The SLAB wire protocol provides a zero-allocation binary format for high-throughput environments. No cloud connectivity is required.",
  },
  {
    q: "How does the xInfer Engine handle model updates?",
    a: "Model graphs are versioned and signed. The OTA canary pipeline deploys new models to a 5% cohort first, monitors for 24 hours, then promotes to the full fleet. Rollback is automatic if recall drops below the configured threshold.",
  },
  {
    q: "What is the typical deployment timeline?",
    a: "Standard deployment is 10 business days from POC request to live appliance. This includes hardware shipping, air-gapped installation, protocol dissector configuration, and operator training. Complex multi-site deployments may take longer.",
  },
  {
    q: "Do you offer custom protocol dissector development?",
    a: "Yes. The Protocol Engineering team can build custom dissectors for proprietary or legacy protocols. This is a professional services engagement — contact the field engineering team for scoping.",
  },
];

const RESOURCES = [
  { label: "Knowledge Base", desc: "Searchable articles on configuration, troubleshooting, and best practices", to: "/docs" },
  { label: "Video Tutorials", desc: "Step-by-step deployment and configuration walkthroughs", to: "/docs" },
  { label: "API Reference", desc: "Complete REST and gRPC API documentation", to: "/docs#api-reference" },
  { label: "Community Forum", desc: "Peer-to-peer discussion with other Aryorithm operators", to: "/support" },
  { label: "Status Page", desc: "Real-time appliance fleet health and incident status", to: "/support" },
  { label: "Customer Enclave", desc: "Download updates, access SBOMs, and manage licenses", to: "/portal" },
];

export default function SupportPage() {
  return (
    <>
      <section id="support-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Support" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Help Center <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Support & <span className="text-cyan">Help Center.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Get help with your Aryorithm deployment. Technical support, training, troubleshooting, and customer
            resources — all air-gapped friendly.
          </p>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["P1 SLA", "4 hours"], ["P2 SLA", "24 hours"], ["Fleet Uptime", "99.99%"]]} />
          </div>
        </div>
      </section>

      <section id="channels" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Support Channels"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">How To Reach Us.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {SUPPORT_CHANNELS.map((ch) => (
            <div key={ch.title} className="rounded-md border border-hairline bg-panel p-6">
              <div className="flex items-center gap-3">
                <span className="text-[20px]" aria-hidden="true">{ch.icon}</span>
                <h3 className="font-display text-[15px] font-bold" style={{ color: ch.color }}>{ch.title}</h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{ch.desc}</p>
              <div className="mt-4 space-y-1.5">
                <p className="font-mono text-[11.5px]">
                  <span className="text-muted">EMAIL: </span>
                  <a href={`mailto:${ch.contact}`} className="text-cyan hover:underline">{ch.contact}</a>
                </p>
                <p className="font-mono text-[11.5px]">
                  <span className="text-muted">SLA: </span>
                  <span className="text-ink">{ch.sla}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// FAQ"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Frequently Asked Questions.</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-md border border-hairline bg-panel">
              <summary className="flex cursor-pointer items-center justify-between p-5 font-display text-[14px] font-bold text-ink transition-colors hover:text-cyan">
                {faq.q}
                <span className="ml-4 shrink-0 font-mono text-[12px] text-muted transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="border-t border-hairline px-5 py-4 text-[13px] leading-relaxed text-muted">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="resources" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Resources"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Self-Service Resources.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((r) => (
            <Link key={r.label} href={r.to} className="rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/40">
              <h3 className="font-display text-[14px] font-bold text-ink">{r.label}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{r.desc}</p>
            </Link>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
