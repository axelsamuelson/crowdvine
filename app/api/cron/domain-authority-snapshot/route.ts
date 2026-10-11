import { NextRequest, NextResponse } from "next/server";

import { captureDomainAuthoritySnapshots } from "@/lib/seo/capture-domain-authority-snapshot";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Weekly domain-authority snapshot (Open PageRank + GSC + sitemap).
 * Secured by CRON_SECRET. Schedule: 0 5 * * 1 (Mon 05:00 UTC) — see vercel.json
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await captureDomainAuthoritySnapshots();
    return NextResponse.json(result, {
      status: result.ok ? 200 : 207,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/domain-authority-snapshot]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
