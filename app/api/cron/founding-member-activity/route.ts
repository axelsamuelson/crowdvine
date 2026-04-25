import { NextRequest, NextResponse } from "next/server";
import { runFoundingMemberActivityCheck } from "@/lib/membership/founding-member-activity";

/**
 * Cron: Founding Member half-year activity check.
 * Secured by CRON_SECRET: Authorization: Bearer ${CRON_SECRET}
 * Schedule: 0 3 1 1,7 * (Jan 1 and Jul 1 at 03:00 UTC)
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runFoundingMemberActivityCheck();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[cron/founding-member-activity] Error:", message);
    return NextResponse.json({ ok: true, checked: 0, retained: 0, degraded: 0 });
  }
}

