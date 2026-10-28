import { NextResponse } from "next/server";
import { getCachedWineFewLeftThreshold } from "@/lib/wine-settings-cache";

/**
 * GET /api/wine-settings
 * Returns wine display settings (e.g. few-left threshold for B2B stock badges).
 * Site-wide CMS value — not user/session/zone/currency dependent.
 * Backed by unstable_cache tag "wine-settings" (same as root layout).
 */
export async function GET() {
  const fewLeftThreshold = await getCachedWineFewLeftThreshold();
  return NextResponse.json(
    { fewLeftThreshold },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
