import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    console.log("🧹 Starting invitation cleanup process...");

    // Find invitations that reference deleted users
    const { data: orphanedInvitations, error: findError } = await supabase
      .from("invitation_codes")
      .select(
        `
        id,
        code,
        used_by,
        used_at,
        current_uses,
        profiles!invitation_codes_used_by_fkey(id, email)
      `,
      )
      .not("used_by", "is", null)
      .gt("current_uses", 0);

    if (findError) {
      console.error("Error finding orphaned invitations:", findError);
      return NextResponse.json(
        { error: "Failed to find orphaned invitations" },
        { status: 500 },
      );
    }

    console.log(
      `📊 Found ${orphanedInvitations?.length || 0} invitations with used_by references`,
    );

    // Identify invitations where the referenced user no longer exists
    const orphanedInvitationIds: string[] = [];

    if (orphanedInvitations) {
      for (const invitation of orphanedInvitations) {
        // If profiles is null, it means the user was deleted
        if (!invitation.profiles) {
          orphanedInvitationIds.push(invitation.id);
          console.log(
            `🗑️ Orphaned invitation found: ${invitation.code} (used_by: ${invitation.used_by})`,
          );
        }
      }
    }

    console.log(
      `🔍 Found ${orphanedInvitationIds.length} orphaned invitations to clean up`,
    );

    if (orphanedInvitationIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No orphaned invitations found",
        cleanedCount: 0,
      });
    }

    // Clean up orphaned invitations by setting used_by to null and resetting usage
    const { data: updatedInvitations, error: updateError } = await supabase
      .from("invitation_codes")
      .update({
        used_by: null,
        used_at: null,
        current_uses: 0,
      })
      .in("id", orphanedInvitationIds)
      .select("id, code");

    if (updateError) {
      console.error("Error cleaning up orphaned invitations:", updateError);
      return NextResponse.json(
        { error: "Failed to clean up orphaned invitations" },
        { status: 500 },
      );
    }

    console.log(
      `✅ Successfully cleaned up ${updatedInvitations?.length || 0} orphaned invitations`,
    );

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${updatedInvitations?.length || 0} orphaned invitations`,
      cleanedCount: updatedInvitations?.length || 0,
      cleanedInvitations: updatedInvitations,
    });
  } catch (error) {
    console.error("Invitation cleanup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
