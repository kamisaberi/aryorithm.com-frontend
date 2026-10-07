import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Customer enclave demo UI + any API routes stay out of the index.
        disallow: ["/portal", "/api/"],
      },
    ],
    sitemap: "https://aryorithm.com/sitemap.xml",
  };
}
