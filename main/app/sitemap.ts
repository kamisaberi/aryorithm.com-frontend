import type { MetadataRoute } from "next";

import { NEWS_ITEMS } from "@/data/news";
import { DIRECTORY } from "@/data/team";
import { getAllHelpArticles } from "@/data/help";
import { allDocs as blackboxEssentialDocs } from "@/lib/blackbox-docs";
import { allDocs as blackboxSentinelDocs } from "@/lib/blackbox-sentinel-docs";
import { allDocs as sentinelLabDocs } from "@/lib/sentinel-lab-docs";
import { allDocs as sentinelMatrixDocs } from "@/lib/sentinel-matrix-docs";
import { allDocs as sentinelNexusDocs } from "@/lib/sentinel-nexus-docs";
import { allDocs as sentinelStackDocs } from "@/lib/sentinel-stack-docs";
import { allDocs as xinferDocs } from "@/lib/xinfer-docs";
import { allDocs as xinferForgeDocs } from "@/lib/xinfer-forge-docs";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/platform/nexus", priority: 0.9 },
  { path: "/products/sentinel", priority: 0.9 },
  { path: "/technology/xinfer", priority: 0.9 },
  { path: "/technology/blackbox", priority: 0.9 },
  { path: "/technology/forge", priority: 0.9 },
  { path: "/projects", priority: 0.8 },
  { path: "/projects/blackbox-sentinel", priority: 0.8 },
  { path: "/projects/sentinel-nexus", priority: 0.8 },
  { path: "/projects/xinfer-essential", priority: 0.8 },
  { path: "/projects/blackbox-essential", priority: 0.8 },
  { path: "/projects/xinfer-forge", priority: 0.8 },
  { path: "/projects/sentinel-lab", priority: 0.8 },
  { path: "/projects/sentinel-matrix", priority: 0.8 },
  { path: "/projects/sentinel-stack", priority: 0.8 },
  { path: "/research/sentinel-lab", priority: 0.8 },
  { path: "/papers", priority: 0.7 },
  { path: "/insights", priority: 0.7 },
  { path: "/news", priority: 0.7 },
  { path: "/pricing", priority: 0.8 },
  { path: "/docs", priority: 0.8 },
  { path: "/docs/blackbox-essential", priority: 0.7 },
  { path: "/docs/blackbox-sentinel", priority: 0.7 },
  { path: "/docs/sentinel-lab", priority: 0.7 },
  { path: "/docs/sentinel-matrix", priority: 0.7 },
  { path: "/docs/sentinel-nexus", priority: 0.7 },
  { path: "/docs/sentinel-stack", priority: 0.7 },
  { path: "/docs/xinfer-essential", priority: 0.7 },
  { path: "/docs/xinfer-forge", priority: 0.7 },
  { path: "/about", priority: 0.6 },
  { path: "/team", priority: 0.6 },
  { path: "/careers", priority: 0.6 },
  { path: "/partners", priority: 0.6 },
  { path: "/trust", priority: 0.6 },
  { path: "/faq", priority: 0.6 },
  { path: "/help", priority: 0.6 },
  { path: "/support", priority: 0.5 },
  { path: "/contact", priority: 0.7 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/security", priority: 0.4 },
];

const DOCS_APIS: { base: string; allDocs: () => { slug: string[] }[] }[] = [
  { base: "/docs/blackbox-essential", allDocs: blackboxEssentialDocs },
  { base: "/docs/blackbox-sentinel", allDocs: blackboxSentinelDocs },
  { base: "/docs/sentinel-lab", allDocs: sentinelLabDocs },
  { base: "/docs/sentinel-matrix", allDocs: sentinelMatrixDocs },
  { base: "/docs/sentinel-nexus", allDocs: sentinelNexusDocs },
  { base: "/docs/sentinel-stack", allDocs: sentinelStackDocs },
  { base: "/docs/xinfer-essential", allDocs: xinferDocs },
  { base: "/docs/xinfer-forge", allDocs: xinferForgeDocs },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const urls: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `https://aryorithm.com${r.path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: r.priority,
  }));

  for (const item of NEWS_ITEMS) {
    urls.push({
      url: `https://aryorithm.com/news/${item.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const m of DIRECTORY) {
    if (m.aliasOf) continue;
    urls.push({
      url: `https://aryorithm.com/team/${m.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  for (const { category, article } of getAllHelpArticles()) {
    urls.push({
      url: `https://aryorithm.com/help/${category.id}/${article.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  for (const api of DOCS_APIS) {
    for (const d of api.allDocs()) {
      if (d.slug.length === 0) continue;
      urls.push({
        url: `https://aryorithm.com${api.base}/${d.slug.join("/")}`,
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  }

  return urls;
}
