import { NextRequest, NextResponse } from "next/server";

import { runSystembolagetSync } from "@/lib/systembolaget/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Weekly Systembolaget assortment sync → systembolaget_products.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 * Schedule: 0 4 * * 1 (Mondays 04:00 UTC) — see vercel.json
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSystembolagetSync();
    if (!result.ok) {
      return NextResponse.json(result, { status: 503 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/systembolaget-sync]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
