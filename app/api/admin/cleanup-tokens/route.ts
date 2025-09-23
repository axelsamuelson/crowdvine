import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    console.log("=== CLEANUP EXPIRED TOKENS START ===");

    const supabase = getSupabaseAdmin();

    // Clean up expired access tokens
    const { data: expiredTokens, error: tokensError } = await supabase
      .from("access_tokens")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .eq("used", false)
      .select();

    if (tokensError) {
      console.error("Error cleaning up expired access tokens:", tokensError);
      return NextResponse.json({
        success: false,
        error: "Failed to clean up expired access tokens",
        details: tokensError.message,
      });
    }

    // Clean up expired invitation codes (mark as inactive instead of deleting)
    const { data: expiredInvitations, error: invitationsError } = await supabase
      .from("invitation_codes")
      .update({ is_active: false })
      .lt("expires_at", new Date().toISOString())
      .eq("is_active", true)
      .select();

    if (invitationsError) {
      console.error(
        "Error cleaning up expired invitation codes:",
        invitationsError,
      );
      return NextResponse.json({
        success: false,
        error: "Failed to clean up expired invitation codes",
        details: invitationsError.message,
      });
    }

    const tokensCleaned = expiredTokens?.length || 0;
    const invitationsCleaned = expiredInvitations?.length || 0;

    console.log(
      `Cleaned up ${tokensCleaned} expired access tokens and ${invitationsCleaned} expired invitation codes`,
    );
    console.log("=== CLEANUP EXPIRED TOKENS END ===");

    return NextResponse.json({
      success: true,
      message: `Cleanup completed successfully`,
      tokensCleaned,
      invitationsCleaned,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cleanup tokens API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Optional: GET endpoint to check cleanup status without actually cleaning
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Count expired but unused access tokens
    const { count: expiredTokensCount, error: tokensError } = await supabase
      .from("access_tokens")
      .select("*", { count: "exact", head: true })
      .lt("expires_at", new Date().toISOString())
      .eq("used", false);

    if (tokensError) {
      console.error("Error counting expired access tokens:", tokensError);
    }

    // Count expired but active invitation codes
    const { count: expiredInvitationsCount, error: invitationsError } =
      await supabase
        .from("invitation_codes")
        .select("*", { count: "exact", head: true })
        .lt("expires_at", new Date().toISOString())
        .eq("is_active", true);

    if (invitationsError) {
      console.error(
        "Error counting expired invitation codes:",
        invitationsError,
      );
    }

    return NextResponse.json({
      success: true,
      expiredTokensCount: expiredTokensCount || 0,
      expiredInvitationsCount: expiredInvitationsCount || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Check cleanup status API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
