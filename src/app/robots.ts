import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://agent-skill-marketplace.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/traces/", "/builder/", "/install/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
