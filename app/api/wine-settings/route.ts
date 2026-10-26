import { NextResponse } from "next/server";
import { getWineFewLeftThreshold } from "@/lib/actions/wine-settings";

/**
 * GET /api/wine-settings
 * Returns wine display settings (e.g. few-left threshold for B2B stock badges).
 * Site-wide CMS value — not user/session/zone/currency dependent.
 */
export async function GET() {
  const fewLeftThreshold = await getWineFewLeftThreshold();
  return NextResponse.json(
    { fewLeftThreshold },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
