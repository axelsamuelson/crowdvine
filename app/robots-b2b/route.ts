import { NextResponse } from "next/server";

import { ROBOTS_DISALLOW_PATHS } from "@/lib/seo/robots-disallow";

export async function GET() {
  const disallowLines = ROBOTS_DISALLOW_PATHS.map(
    (path) => `Disallow: ${path}`,
  ).join("\n");

  const content = `User-agent: *
Allow: /
${disallowLines}

Sitemap: https://dirtywine.se/sitemap.xml`;

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
