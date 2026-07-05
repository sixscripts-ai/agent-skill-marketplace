import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Agent Skill Marketplace",
    short_name: "Skills",
    description:
      "Browse, run, evaluate, version, trace, and export portable AI agent skills.",
    start_url: "/marketplace",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
