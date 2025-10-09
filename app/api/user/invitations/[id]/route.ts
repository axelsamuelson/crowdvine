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
    console.log("[INVITE-DELETE] Starting delete request");
    
    const user = await getCurrentUser();
    if (!user) {
      console.log("[INVITE-DELETE] No user found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[INVITE-DELETE] User authenticated:", user.id);

    const resolvedParams = await params;
    console.log("[INVITE-DELETE] Invitation ID to delete:", resolvedParams.id);

    const sb = getSupabaseAdmin();

    // Verify invitation belongs to this user
    console.log("[INVITE-DELETE] Fetching invitation to verify ownership");
    const { data: invitation, error: fetchError } = await sb
      .from('invitation_codes')
      .select('created_by')
      .eq('id', resolvedParams.id)
      .single();

    if (fetchError || !invitation) {
      console.error("[INVITE-DELETE] Invitation fetch error:", {
        error: fetchError,
        code: fetchError?.code,
        message: fetchError?.message
      });
      return NextResponse.json(
        { 
          error: "Invitation not found",
          details: fetchError?.message
        },
        { status: 404 }
      );
    }

    console.log("[INVITE-DELETE] Invitation found, created by:", invitation.created_by);

    if (invitation.created_by !== user.id) {
      console.log("[INVITE-DELETE] Ownership mismatch");
      return NextResponse.json(
        { error: "You can only delete your own invitations" },
        { status: 403 }
      );
    }

    // Soft delete: mark as inactive
    console.log("[INVITE-DELETE] Marking invitation as inactive");
    const { error } = await sb
      .from('invitation_codes')
      .update({
        is_active: false,
        // Note: updated_at removed - column may not exist in current schema
      })
      .eq('id', resolvedParams.id);

    if (error) {
      console.error("[INVITE-DELETE] Update error:", {
        error,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint
      });
      return NextResponse.json(
        { 
          error: "Failed to deactivate invitation",
          details: error?.message,
          code: error?.code
        },
        { status: 500 }
      );
    }

    console.log("[INVITE-DELETE] Invitation deactivated successfully");

    // Decrement invites_used_this_month to give back the quota
    console.log("[INVITE-DELETE] Fetching membership for quota return");
    const { data: membership, error: membershipFetchError } = await sb
      .from("user_memberships")
      .select("invites_used_this_month")
      .eq("user_id", user.id)
      .single();

    if (membershipFetchError) {
      console.error("[INVITE-DELETE] Failed to fetch membership:", membershipFetchError);
      // Don't fail the request, invitation was already deleted
    } else if (membership && membership.invites_used_this_month > 0) {
      console.log("[INVITE-DELETE] Decrementing quota");
      const { error: quotaError } = await sb
        .from("user_memberships")
        .update({
          invites_used_this_month: membership.invites_used_this_month - 1,
          // updated_at will be handled by trigger if it exists
        })
        .eq("user_id", user.id);

      if (quotaError) {
        console.error("[INVITE-DELETE] Failed to update quota:", quotaError);
      } else {
        console.log("[INVITE-DELETE] Quota returned successfully");
      }
    }

    console.log("[INVITE-DELETE] Delete operation completed");

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

