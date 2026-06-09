import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = "https://dirtywine.se";

  const urls = [
    { url: baseUrl, priority: 1.0 },
    { url: `${baseUrl}/vin`, priority: 0.9 },
    { url: `${baseUrl}/wine`, priority: 0.9 },
    { url: `${baseUrl}/producers`, priority: 0.8 },
    { url: `${baseUrl}/about`, priority: 0.7 },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.url}</loc>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
