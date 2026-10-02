import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import { StatStrip } from "@/components/ui/StatusBadge";
import { PROJECTS } from "@/data/projects";

export const metadata: Metadata = {
  title: "Projects & Applications | Aryorithm",
  description: "Explore the Aryorithm ecosystem: Blackbox Sentinel, Sentinel Nexus, xInfer Essential, Blackbox Core, xInfer Forge, Sentinel-Lab, and SLAB Protocol.",
};

const CATEGORIES = ["Platform", "Engine", "Research", "Protocol"] as const;

export default function ProjectsPage() {
  return (
    <>
      <section id="projects-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "Projects & Applications" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-cyan">[</span> The Ecosystem <span className="text-cyan">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            Projects, Applications & <span className="text-cyan">Libraries.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            The full Aryorithm ecosystem — from kernel-level mitigation engines to open research platforms. Each project
            is engineered for sovereignty: no cloud dependencies, no managed runtimes, no compromise.
          </p>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Projects", String(PROJECTS.length)], ["Open Source", "3"], ["GA Releases", "5"]]} />
          </div>
        </div>
      </section>

      <section id="projects-grid" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="grid gap-4 sm:grid-cols-2">
              {PROJECTS.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="group rounded-md border border-hairline bg-panel p-6 transition-colors hover:border-cyan/40"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="rounded-md border border-hairline px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                      style={{ color: project.color }}
                    >
                      {project.category}
                    </span>
                    <span className="font-mono text-[10px] text-muted">{project.version}</span>
                  </div>
                  <h2 className="mt-4 font-display text-[18px] font-bold text-ink group-hover:text-cyan">
                    {project.name}
                  </h2>
                  <p className="mt-1 font-mono text-[11px] text-muted">{project.tagline}</p>
                  <p className="mt-3 text-[13px] leading-relaxed text-muted">{project.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: project.color }}>
                      {project.status}
                    </span>
                    <span className="font-mono text-[11px] text-cyan">Explore →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <PageSidebar
            sections={[
              {
                heading: "Categories",
                items: CATEGORIES.map((cat) => ({
                  label: cat,
                  href: `/projects?category=${cat.toLowerCase()}`,
                  meta: String(PROJECTS.filter((p) => p.category === cat).length),
                })),
              },
              {
                heading: "Quick Links",
                items: [
                  { label: "Blackbox Sentinel", href: "/projects/blackbox-sentinel", meta: "v4.2.1" },
                  { label: "xInfer Essential", href: "/projects/xinfer-essential", meta: "v4.2.0" },
                  { label: "Sentinel-Lab", href: "/projects/sentinel-lab", meta: "v2.4.0" },
                ],
              },
            ]}
            cta={{ label: "Request Defense POC", href: "/contact" }}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
