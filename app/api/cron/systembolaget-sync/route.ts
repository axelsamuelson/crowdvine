import { NextRequest, NextResponse } from "next/server";

import { alertSystembolagetSyncFailure } from "@/lib/systembolaget/sync-alert";
import { runSystembolagetSync } from "@/lib/systembolaget/sync";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Systembolaget assortment sync → systembolaget_products.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 * Schedule: 0 4 * * 1,4 (Mon + Thu 04:00 UTC) — see vercel.json
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
      void alertSystembolagetSyncFailure({ result }).catch((err) => {
        console.error(
          "[cron/systembolaget-sync] alert failed",
          err instanceof Error ? err.message : err,
        );
      });
      const status = result.reason === "shrink_guard" ? 409 : 503;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/systembolaget-sync]", message);
    void alertSystembolagetSyncFailure({ errorMessage: message }).catch(
      (alertErr) => {
        console.error(
          "[cron/systembolaget-sync] alert failed",
          alertErr instanceof Error ? alertErr.message : alertErr,
        );
      },
    );
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
