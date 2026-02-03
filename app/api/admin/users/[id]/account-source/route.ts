import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";

type AccountSourceType =
  | "invitation"
  | "access_token"
  | "access_request"
  | "direct_signup"
  | "unknown";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: userId } = await params;
    const sb = getSupabaseAdmin();

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("id, email, invite_code_used, created_at, access_granted_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const email = String(profile.email || "").toLowerCase().trim();
    const inviteCodeUsed = (profile as any).invite_code_used as
      | string
      | null
      | undefined;

    // 1) Invitation-based signup
    let invitation: any | null = null;
    if (inviteCodeUsed) {
      const { data, error } = await sb
        .from("invitation_codes")
        .select("*")
        .eq("code", inviteCodeUsed)
        .maybeSingle();
      if (error) throw error;
      invitation = data || null;
    }

    if (!invitation) {
      // fallback: invitation row linked via used_by user_id
      const { data, error } = await sb
        .from("invitation_codes")
        .select("*")
        .eq("used_by", userId)
        .order("used_at", { ascending: false })
        .limit(1);
      if (error) {
        // Some schemas may not have used_by; don't hard-fail.
        console.warn(
          "Warning querying invitation_codes.used_by for account source:",
          error,
        );
      } else if (Array.isArray(data) && data[0]) {
        invitation = data[0];
      }
    }

    if (invitation) {
      let inviterProfile: any | null = null;
      const inviterId = invitation.created_by;
      if (inviterId) {
        const { data, error } = await sb
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", inviterId)
          .maybeSingle();
        if (error) throw error;
        inviterProfile = data || null;
      }

      return NextResponse.json({
        source: "invitation" as AccountSourceType,
        profile: {
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at,
          access_granted_at: profile.access_granted_at,
          invite_code_used: inviteCodeUsed || null,
        },
        invitation: {
          id: invitation.id,
          code: invitation.code,
          created_by: invitation.created_by,
          created_at: invitation.created_at,
          used_at: invitation.used_at,
          used_by: invitation.used_by,
          email: invitation.email ?? null,
          initial_level: invitation.initial_level ?? null,
          inviter_profile: inviterProfile,
        },
      });
    }

    // 2) Access token-based signup (approved access request flow)
    if (email) {
      const { data: token, error: tokenError } = await sb
        .from("access_tokens")
        .select("token, email, created_at, expires_at, used, used_at, initial_level")
        .eq("email", email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenError) {
        console.warn("Warning querying access_tokens for account source:", tokenError);
      } else if (token && (token.used || token.used_at)) {
        return NextResponse.json({
          source: "access_token" as AccountSourceType,
          profile: {
            id: profile.id,
            email: profile.email,
            created_at: profile.created_at,
            access_granted_at: profile.access_granted_at,
            invite_code_used: inviteCodeUsed || null,
          },
          access_token: token,
        });
      }
    }

    // 3) Access request flow (may exist if not cleaned up)
    if (email) {
      const { data: accessReq, error: accessReqError } = await sb
        .from("access_requests")
        .select("id, email, status, requested_at, reviewed_at, reviewed_by, notes, initial_level")
        .eq("email", email)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (accessReqError) {
        console.warn(
          "Warning querying access_requests for account source:",
          accessReqError,
        );
      } else if (accessReq) {
        return NextResponse.json({
          source: "access_request" as AccountSourceType,
          profile: {
            id: profile.id,
            email: profile.email,
            created_at: profile.created_at,
            access_granted_at: profile.access_granted_at,
            invite_code_used: inviteCodeUsed || null,
          },
          access_request: accessReq,
        });
      }
    }

    // 4) Fallbacks
    return NextResponse.json({
      source: "direct_signup" as AccountSourceType,
      profile: {
        id: profile.id,
        email: profile.email,
        created_at: profile.created_at,
        access_granted_at: profile.access_granted_at,
        invite_code_used: inviteCodeUsed || null,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/admin/users/[id]/account-source:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

