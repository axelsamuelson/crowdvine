import { NextRequest, NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/admin-auth-server";
import { runFoundingMemberActivityCheck } from "@/lib/membership/founding-member-activity";

/**
 * POST /api/admin/founding-member-activity
 *
 * Manual trigger for the Founding Member activity check (admin only).
 */
export async function POST(request: NextRequest) {
  try {
    try {
      await requireAdmin();
    } catch (error) {
      const status = error instanceof AdminAuthError ? error.status : 401;
      return NextResponse.json(
        { error: status === 403 ? "Forbidden" : "Unauthorized" },
        { status },
      );
    }

    const summary = await runFoundingMemberActivityCheck();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[admin/founding-member-activity] Error:", message);
    return NextResponse.json({ ok: true, checked: 0, retained: 0, degraded: 0 });
  }
}

