import { NextResponse } from "next/server";
import { getWineFewLeftThreshold } from "@/lib/actions/wine-settings";

/**
 * GET /api/wine-settings
 * Returns wine display settings (e.g. few-left threshold for B2B stock badges).
 */
export async function GET() {
  const fewLeftThreshold = await getWineFewLeftThreshold();
  return NextResponse.json({ fewLeftThreshold });
}
