import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl, getB2BAppUrl } from "@/lib/app-url";
import { getInviteUrl } from "@/lib/invitation-path";

function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/invitations/generate
 * Generates an invitation code for the current user (non-admin flow)
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const expiresInDays = Number(body?.expiresInDays ?? 30);
    const invitationType =
      body?.invitation_type === "producer" || body?.invitation_type === "business"
        ? body.invitation_type
        : "consumer";
    const allowedTypes = [invitationType];

    const sb = getSupabaseAdmin();

    const { data: membership, error: membershipError } = await sb
      .from("user_memberships")
      .select("level, invite_quota_monthly, invites_used_this_month")
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: "Membership not found",
          details: membershipError?.message,
        },
        { status: 403 },
      );
    }

    if (membership.level === "requester") {
      return NextResponse.json(
        { error: "Requesters cannot generate invitations" },
        { status: 403 },
      );
    }

    const availableInvites =
      (membership.invite_quota_monthly ?? 0) - (membership.invites_used_this_month ?? 0);

    if (availableInvites <= 0) {
      return NextResponse.json(
        { error: "No invites remaining this month" },
        { status: 403 },
      );
    }

    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(expiresInDays) ? expiresInDays : 30));

    const { data: invitation, error: inviteError } = await sb
      .from("invitation_codes")
      .insert({
        id: randomUUID(),
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        is_active: true,
        initial_level: "basic",
        invitation_type: invitationType,
        allowed_types: allowedTypes,
      })
      .select()
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Failed to create invitation", details: inviteError?.message },
        { status: 500 },
      );
    }

    // Increment quota usage (best-effort)
    await sb
      .from("user_memberships")
      .update({
        invites_used_this_month: (membership.invites_used_this_month ?? 0) + 1,
      })
      .eq("user_id", user.id);

    const hasBusiness = allowedTypes.includes("business");
    const baseUrl = hasBusiness ? getB2BAppUrl() : getAppUrl();
    const signupUrl = getInviteUrl(baseUrl, code, allowedTypes);
    const codeSignupUrl = `${baseUrl}/c/${code}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        code,
        signupUrl,
        codeSignupUrl,
        expiresAt: invitation.expires_at,
        maxUses: invitation.max_uses,
        initialLevel: invitation.initial_level,
        createdAt: invitation.created_at,
      },
    });
  } catch (error) {
    console.error("Generate invitation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
