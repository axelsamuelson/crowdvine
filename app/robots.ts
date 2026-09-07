import type { MetadataRoute } from "next";

import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-disallow";

// B2B robots via middleware rewrite; pact uses app/robots.ts with the same disallow list.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [...ROBOTS_DISALLOW_PATHS],
      },
    ],
    sitemap: "https://pactwines.com/sitemap.xml",
  };
}
