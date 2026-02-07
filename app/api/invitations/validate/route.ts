import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * POST /api/invitations/validate
 *
 * Validate an invitation code and return invitation details with creator info
 */
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Invitation code required" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    // Fetch invitation with creator profile info
    const { data: invitation, error } = await sb
      .from("invitation_codes")
      .select(
        `
        id,
        code,
        created_by,
        used_at,
        used_by,
        expires_at,
        is_active,
        max_uses,
        initial_level,
        invitation_type,
        allowed_types,
        can_change_account_type,
        created_at,
        profiles!created_by(email, full_name)
      `,
      )
      .eq("code", code)
      .maybeSingle();

    if (error) {
      console.error("Error fetching invitation:", error);
      return NextResponse.json(
        { success: false, error: "Failed to validate invitation" },
        { status: 500 },
      );
    }

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "Invalid invitation code" },
        { status: 404 },
      );
    }

    // Check if invitation is active
    if (!invitation.is_active) {
      return NextResponse.json(
        { success: false, error: "This invitation has been deactivated" },
        { status: 400 },
      );
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "This invitation has expired" },
        { status: 400 },
      );
    }

    // Check if already used (based on used_at)
    if (invitation.used_at) {
      return NextResponse.json(
        { success: false, error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    const allowedTypes =
      invitation.allowed_types && invitation.allowed_types.length > 0
        ? invitation.allowed_types
        : invitation.invitation_type === "producer" ||
            invitation.invitation_type === "business"
          ? [invitation.invitation_type]
          : ["consumer"];
    const invitationType =
      allowedTypes[0] === "producer" || allowedTypes[0] === "business"
        ? allowedTypes[0]
        : "consumer";
    const canChangeAccountType = !!invitation.can_change_account_type;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        created_by: invitation.created_by,
        expires_at: invitation.expires_at,
        max_uses: invitation.max_uses,
        initial_level: invitation.initial_level,
        invitation_type: invitationType,
        allowed_types: allowedTypes,
        can_change_account_type: canChangeAccountType,
        used_at: invitation.used_at ?? undefined,
        profiles: invitation.profiles, // Contains { email, full_name }
      },
    });
  } catch (error) {
    console.error("Validate invitation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
