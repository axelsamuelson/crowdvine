import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import { ensurePersonalInviteForUser } from "@/lib/referral/ensure-personal-invite";

/**
 * POST /api/invitations/validate
 *
 * Validate an invitation code and return invitation details with creator info
 */
export async function POST(request: Request) {
  try {
    const { code } = await request.json();

    if (!code) {
      void logUserEventServer({
        userId: null,
        eventType: "invitation_code_invalid",
        eventCategory: "invitation",
        metadata: { reason: "missing_code", source: "validate_api" },
      });
      return NextResponse.json(
        { success: false, error: "Invitation code required" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const normalizedCode = String(code).trim().toUpperCase();

    const invitationSelect = `
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
        is_personal_link,
        profiles!created_by(email, full_name)
      `;

    // Fetch invitation with creator profile info
    let invitation: any = null;
    let error: any = null;
    {
      const res = await sb
        .from("invitation_codes")
        .select(invitationSelect)
        .eq("code", normalizedCode)
        .maybeSingle();
      invitation = res.data;
      error = res.error;
    }

    if (error) {
      console.error("Error fetching invitation:", error);
      return NextResponse.json(
        { success: false, error: "Failed to validate invitation" },
        { status: 500 },
      );
    }

    if (!invitation) {
      const { data: inviterProfile } = await sb
        .from("profiles")
        .select("id")
        .eq("personal_invite_code", normalizedCode)
        .maybeSingle();

      if (inviterProfile?.id) {
        try {
          await ensurePersonalInviteForUser(sb, inviterProfile.id);
        } catch (e) {
          console.error("[validate] ensurePersonalInviteForUser failed:", e);
        }
        const res2 = await sb
          .from("invitation_codes")
          .select(invitationSelect)
          .eq("code", normalizedCode)
          .maybeSingle();
        invitation = res2.data;
        error = res2.error;
      }
    }

    if (error) {
      console.error("Error fetching invitation (pass 2):", error);
      return NextResponse.json(
        { success: false, error: "Failed to validate invitation" },
        { status: 500 },
      );
    }

    if (!invitation) {
      void logUserEventServer({
        userId: null,
        eventType: "invitation_code_invalid",
        eventCategory: "invitation",
        metadata: { reason: "not_found", source: "validate_api" },
      });
      return NextResponse.json(
        { success: false, error: "Invalid invitation code" },
        { status: 404 },
      );
    }

    const isPersonal = !!invitation.is_personal_link;

    // Check if invitation is active
    if (!invitation.is_active) {
      void logUserEventServer({
        userId: null,
        eventType: "invitation_code_invalid",
        eventCategory: "invitation",
        metadata: { reason: "inactive", source: "validate_api" },
      });
      return NextResponse.json(
        { success: false, error: "This invitation has been deactivated" },
        { status: 400 },
      );
    }

    // Check if expired (personal pool links use a far-future expires_at)
    if (invitation.expires_at) {
      const expiresAt = new Date(invitation.expires_at);
      if (!isPersonal && expiresAt < new Date()) {
        void logUserEventServer({
          userId: null,
          eventType: "invitation_code_expired",
          eventCategory: "invitation",
          metadata: { source: "validate_api" },
        });
        return NextResponse.json(
          { success: false, error: "This invitation has expired" },
          { status: 400 },
        );
      }
    }

    // Check if already used (single-use invites only)
    if (!isPersonal && invitation.used_at) {
      void logUserEventServer({
        userId: null,
        eventType: "invitation_code_invalid",
        eventCategory: "invitation",
        metadata: { reason: "already_used", source: "validate_api" },
      });
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
        is_personal_link: isPersonal,
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
