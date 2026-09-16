import { NextResponse } from "next/server";

import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-disallow";

/** Guides are PACT-owned SEO — keep them out of dirtywine crawl budget. */
const DIRTYWINE_GUIDE_DISALLOW = ["/guider", "/guides"] as const;

export async function GET() {
  const disallowLines = [
    ...ROBOTS_DISALLOW_PATHS,
    ...DIRTYWINE_GUIDE_DISALLOW,
  ]
    .map((path) => `Disallow: ${path}`)
    .join("\n");

  const content = `User-agent: *
Allow: /
${disallowLines}

Sitemap: https://dirtywine.se/sitemap.xml`;

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
