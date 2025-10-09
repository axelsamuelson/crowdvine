import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/user/invitations
 * 
 * Returns current user's invitation codes
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const sb = getSupabaseAdmin();

    // Get all invitations created by this user
    const { data: invitations, error } = await sb
      .from('invitation_codes')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      invitations: invitations || [],
    });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

