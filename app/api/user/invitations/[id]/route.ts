import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

/**
 * DELETE /api/user/invitations/[id]
 * 
 * Deactivate an invitation (soft delete)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const sb = getSupabaseAdmin();

    // Verify invitation belongs to this user
    const { data: invitation, error: fetchError } = await sb
      .from('invitation_codes')
      .select('created_by')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invitation.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own invitations" },
        { status: 403 }
      );
    }

    // Soft delete: mark as inactive
    const { error } = await sb
      .from('invitation_codes')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id);

    if (error) throw error;

    // Decrement invites_used_this_month to give back the quota
    const { data: membership } = await sb
      .from("user_memberships")
      .select("invites_used_this_month")
      .eq("user_id", user.id)
      .single();

    if (membership && membership.invites_used_this_month > 0) {
      await sb
        .from("user_memberships")
        .update({
          invites_used_this_month: membership.invites_used_this_month - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    }

    return NextResponse.json({
      success: true,
      message: "Invitation deactivated",
    });
  } catch (error) {
    console.error("Error deleting invitation:", error);
    return NextResponse.json(
      { error: "Failed to delete invitation" },
      { status: 500 }
    );
  }
}

