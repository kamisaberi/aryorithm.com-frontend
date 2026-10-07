import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import PageSidebar from "@/components/layout/PageSidebar";
import { NEWS_ITEMS } from "@/data/news";

export const metadata: Metadata = {
  title: "News & Advisories | Aryorithm",
  description: "Company updates, threat advisories, product releases, and technical announcements from Aryorithm Technologies.",
};

const CATEGORIES = Array.from(new Set(NEWS_ITEMS.map((n) => n.category)));

export default function NewsPage() {
  return (
    <>
      <section id="news-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Company" }, { label: "News & Advisories" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-telemetry">[</span> Latest Updates <span className="text-telemetry">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            News, Advisories & <span className="text-cyan">Engineering Updates.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Product releases, threat advisories, research publications, and company announcements. No marketing fluff —
            just what we shipped, what we found, and what we are building next.
          </p>
        </div>
      </section>

      <section id="news-list" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="space-y-4">
              {NEWS_ITEMS.map((item) => (
                <Link
                  key={item.slug}
                  href={`/news/${item.slug}`}
                  className="block rounded-md border border-hairline bg-panel p-6 transition-colors hover:border-cyan/40"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: item.color }}>
                      {item.category}
                    </span>
                    <span className="font-mono text-[10.5px] text-muted">{item.date}</span>
                    <span className="font-mono text-[10.5px] text-muted">·</span>
                    <span className="font-mono text-[10.5px] text-muted">{item.readTime}</span>
                  </div>
                  <h2 className="mt-2 font-display text-[18px] font-bold text-ink">{item.title}</h2>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{item.excerpt}</p>
                  <span className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.1em] text-cyan">
                    Read More →
                  </span>
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
                  href: `/news?category=${cat.toLowerCase().replace(/\s+/g, "-")}`,
                  meta: String(NEWS_ITEMS.filter((n) => n.category === cat).length),
                })),
              },
              {
                heading: "Recent Posts",
                items: NEWS_ITEMS.slice(0, 4).map((n) => ({
                  label: n.title,
                  href: `/news/${n.slug}`,
                  meta: n.date,
                })),
              },
            ]}
            cta={{ label: "Subscribe To Updates", href: "/contact" }}
          />
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
