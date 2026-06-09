import { NextResponse } from "next/server";

export async function GET() {
  const content = `User-agent: *
Allow: /
Allow: /vin
Allow: /wine
Allow: /product/
Allow: /producer/
Allow: /producers
Allow: /about
Disallow: /admin
Disallow: /api/
Disallow: /checkout
Disallow: /cart

Sitemap: https://dirtywine.se/sitemap-b2b`;

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
