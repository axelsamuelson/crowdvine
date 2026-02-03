import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/invitations
 *
 * Returns current user's invitation codes (both active and used)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Get ACTIVE and UNUSED invitations created by this user
    const { data: activeInvitations, error: activeError } = await sb
      .from("invitation_codes")
      .select("*")
      .eq("created_by", user.id)
      .eq("is_active", true)
      .is("used_at", null)
      .order("created_at", { ascending: false });

    if (activeError) throw activeError;

    // Get USED invitations created by this user
    const { data: usedInvitations, error: usedError } = await sb
      .from("invitation_codes")
      .select(
        `
        *,
        profiles!invitation_codes_used_by_fkey(
          id,
          email,
          full_name
        )
      `,
      )
      .eq("created_by", user.id)
      .not("used_at", "is", null)
      .order("used_at", { ascending: false });

    if (usedError) throw usedError;

    // Filter out invitations where the referenced user no longer exists
    const validUsedInvitations =
      usedInvitations?.filter(
        (invitation) => invitation.profiles?.email,
      ) || [];

    return NextResponse.json({
      active: activeInvitations || [],
      used: validUsedInvitations || [],
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 },
    );
  }
}
