import type { MetadataRoute } from "next";

const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1.0 },
  { path: "/explore", priority: 0.9 },
  { path: "/packages", priority: 0.8 },
  { path: "/models", priority: 0.8 },
  { path: "/datasets", priority: 0.8 },
  { path: "/pcaps", priority: 0.8 },
  { path: "/scenarios", priority: 0.8 },
  { path: "/blueprints", priority: 0.8 },
  { path: "/appliances", priority: 0.9 },
  { path: "/settings/developer", priority: 0.6 },
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
