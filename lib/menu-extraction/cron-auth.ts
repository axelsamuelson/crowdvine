import { NextRequest, NextResponse } from "next/server";
import { isMenuPipelinePaused } from "@/lib/menu-extraction/pipeline-pause";

export function verifyCronSecret(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && auth === `Bearer ${secret}`);
}

/**
 * Authorize menu-pipeline crons. Returns a response to return early, or null to proceed.
 * When paused, returns 200 skipped so Vercel does not retry.
 */
export async function menuCronGate(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await isMenuPipelinePaused()) {
    return NextResponse.json({ ok: true, skipped: true, reason: "paused" });
  }
  return null;
}
