import { NextResponse } from "next/server";

import { buildSitemapEntries } from "@/lib/sitemap-entries";
import { sitemapEntriesToXml } from "@/lib/sitemap-xml";

const DIRTYWINE_BASE_URL = "https://dirtywine.se";

export async function GET() {
  const entries = await buildSitemapEntries(DIRTYWINE_BASE_URL, "dirtywine");
  const xml = sitemapEntriesToXml(entries);

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
