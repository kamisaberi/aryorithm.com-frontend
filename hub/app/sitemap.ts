import type { MetadataRoute } from "next";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/explore", priority: 0.9 },
  { path: "/publish", priority: 0.7 },
  { path: "/docs", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return STATIC_ROUTES.map((r) => ({
    url: `https://hub.aryorithm.com${r.path}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: r.priority,
  }));
}
