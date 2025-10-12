import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch invitations with user details of who used them
    const { data: invitations, error } = await supabase
      .from("invitation_codes")
      .select("*")
      .eq("created_by", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching user invitations:", error);
      return NextResponse.json(
        { error: "Failed to fetch invitations" },
        { status: 500 }
      );
    }

    // For each used invitation, fetch the user who used it
    const enrichedInvitations = await Promise.all(
      (invitations || []).map(async (invite) => {
        if (invite.used_by_user_id) {
          const { data: usedByProfile } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("id", invite.used_by_user_id)
            .single();

          return {
            ...invite,
            used_by_profile: usedByProfile,
          };
        }
        return invite;
      })
    );

    return NextResponse.json(enrichedInvitations || []);
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


