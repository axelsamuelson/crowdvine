import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/me/access
 *
 * Check if current user has access to the platform
 * Returns { access: boolean, level: string }
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({
        access: false,
        level: null,
      });
    }

    const sb = getSupabaseAdmin();

    // Check user's membership level
    const { data: membership, error } = await sb
      .from("user_memberships")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking access:", error);
      return NextResponse.json({
        access: false,
        level: null,
      });
    }

    // User has access if they have a membership and are not a requester
    const hasAccess = membership && membership.level !== "requester";

    return NextResponse.json({
      access: hasAccess,
      level: membership?.level || null,
    });
  } catch (error) {
    console.error("Access check error:", error);
    return NextResponse.json({
      access: false,
      level: null,
    });
  }
}
