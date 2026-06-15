import { NextResponse } from "next/server";

const B2B_ROBOTS_DISALLOW = [
  "/admin",
  "/api/",
  "/checkout",
  "/cart",
  "/access-request",
  "/access-pending",
  "/profile",
  "/log-in",
  "/signup",
  "/reset-password",
  "/forgot-password",
  "/auth/",
  "/taste-quiz",
  "/tasting/",
  "/pallet/",
  "/i/",
  "/ib/",
  "/b/",
  "/p/",
  "/c/",
] as const;

export async function GET() {
  const disallowLines = B2B_ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`).join(
    "\n",
  );

  const content = `User-agent: *
Allow: /
${disallowLines}

Sitemap: https://dirtywine.se/sitemap.xml`;

  return new NextResponse(content, {
    headers: { "Content-Type": "text/plain" },
  });
}
