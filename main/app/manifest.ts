import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aryorithm Technologies",
    short_name: "Aryorithm",
    description:
      "Deterministic sub-millisecond active defense for sovereign infrastructure.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090E",
    theme_color: "#07090E",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
