import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/layout/Breadcrumb";
import ClosingCTA from "@/components/sections/ClosingCTA";
import { StatStrip } from "@/components/ui/StatusBadge";
import { HELP_CATEGORIES } from "@/data/help";

export const metadata: Metadata = {
  title: "Help Center | Aryorithm",
  description: "Comprehensive help center for Aryorithm products. Getting started, installation, configuration, troubleshooting, API reference, security, and more.",
};

const POPULAR_ARTICLES = [
  { slug: "introduction", category: "getting-started", title: "Introduction to Aryorithm" },
  { slug: "quick-start", category: "getting-started", title: "Quick Start Guide" },
  { slug: "installation-guide", category: "installation", title: "Installation Guide" },
  { slug: "configuration-reference", category: "configuration", title: "Configuration Reference" },
  { slug: "common-issues", category: "troubleshooting", title: "Common Issues & Solutions" },
  { slug: "api-overview", category: "api", title: "API Overview" },
  { slug: "security-architecture", category: "security", title: "Security Architecture" },
  { slug: "pricing-overview", category: "billing", title: "Pricing Overview" },
];

export default function HelpPage() {
  return (
    <>
      <section id="help-hero" className="relative overflow-hidden pt-16">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="radial-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1400px] px-5 pb-12 pt-14 lg:px-8">
          <Breadcrumb trail={[{ label: "Support" }, { label: "Help Center" }]} />
          <span className="inline-block rounded-md border border-hairline bg-panel/80 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.13em] text-muted">
            <span className="text-kernel">[</span> Help Center <span className="text-kernel">]</span>
          </span>
          <h1 className="mt-5 max-w-4xl font-display text-[32px] font-bold leading-tight text-ink sm:text-[42px]">
            How Can We <span className="text-cyan">Help You?</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-muted">
            Comprehensive documentation for all Aryorithm products. Browse by category or search for specific topics.
          </p>
          <div className="mt-8 max-w-md">
            <StatStrip items={[["Categories", String(HELP_CATEGORIES.length)], ["Articles", String(HELP_CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0))]]} />
          </div>
        </div>
      </section>

      <section id="popular" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Popular Articles"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">Most Viewed.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/help/${article.category}/${article.slug}`}
              className="rounded-md border border-hairline bg-panel p-5 transition-colors hover:border-cyan/40"
            >
              <h3 className="font-display text-[14px] font-bold text-ink">{article.title}</h3>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                {HELP_CATEGORIES.find((c) => c.id === article.category)?.name}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-[1400px] px-5 py-12 lg:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan">{"// Browse By Category"}</p>
        <h2 className="mt-2 font-display text-[24px] font-bold text-ink lg:text-[30px]">All Categories.</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_CATEGORIES.map((category) => (
            <div
              key={category.id}
              className="rounded-md border border-hairline bg-panel p-6 transition-colors hover:border-cyan/40"
            >
              <Link
                href={`/help/${category.id}/${category.articles[0].slug}`}
                className="flex items-center gap-3"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md font-mono text-[16px]"
                  style={{ backgroundColor: category.color + "18", color: category.color }}
                >
                  {category.icon === "rocket" && "🚀"}
                  {category.icon === "download" && "📥"}
                  {category.icon === "settings" && "⚙️"}
                  {category.icon === "warning" && "⚠️"}
                  {category.icon === "code" && "💻"}
                  {category.icon === "shield" && "🛡️"}
                  {category.icon === "credit-card" && "💳"}
                  {category.icon === "book" && "📖"}
                </span>
                <div>
                  <h3 className="font-display text-[15px] font-bold text-ink">{category.name}</h3>
                  <p className="font-mono text-[10px] text-muted">{category.articles.length} articles</p>
                </div>
              </Link>
              <ul className="mt-4 space-y-1.5">
                {category.articles.slice(0, 3).map((article) => (
                  <li key={article.slug}>
                    <Link
                      href={`/help/${category.id}/${article.slug}`}
                      className="text-[12.5px] text-muted transition-colors hover:text-cyan"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
                {category.articles.length > 3 && (
                  <li className="font-mono text-[10.5px] text-cyan">
                    +{category.articles.length - 3} more articles
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <ClosingCTA />
    </>
  );
}
