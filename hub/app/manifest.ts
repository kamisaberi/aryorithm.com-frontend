import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aryorithm Hub",
    short_name: "Hub",
    description: "Open extension mesh for cyber-physical edge defense.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090E",
    theme_color: "#07090E",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
