import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getProgressionSummary } from "@/lib/membership/progression-rewards";

/**
 * GET /api/user/progression-buffs
 *
 * Returns user's active progression buffs and total percentage
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get progression summary (buffs + total percentage)
    const summary = await getProgressionSummary(user.id);

    if (!summary.success) {
      throw new Error(summary.error || "Failed to fetch progression buffs");
    }

    return NextResponse.json({
      buffs: summary.activeBuffs,
      totalPercentage: summary.totalPercentage,
      currentSegment: summary.currentSegment,
    });
  } catch (error) {
    console.error("Error fetching progression buffs:", error);
    return NextResponse.json(
      { error: "Failed to fetch progression buffs" },
      { status: 500 },
    );
  }
}
