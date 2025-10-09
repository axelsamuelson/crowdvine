import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { addImpactPoints } from "@/lib/membership/points-engine";

/**
 * POST /api/invitations/redeem
 * 
 * Redeem an invitation code and create a new user account with membership
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[INVITE-REDEEM] Starting redemption process");
    
    const { invitation_code, email, password, full_name } = await request.json();

    if (!invitation_code || !email || !password || !full_name) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const sb = getSupabaseAdmin();

    // Validate invitation code
    console.log("[INVITE-REDEEM] Validating invitation code:", invitation_code);
    const { data: invitation, error: inviteError } = await sb
      .from("invitation_codes")
      .select("*")
      .eq("code", invitation_code)
      .eq("is_active", true)
      .maybeSingle();

    if (inviteError) {
      console.error("[INVITE-REDEEM] Invitation fetch error:", inviteError);
      return NextResponse.json(
        { error: "Failed to validate invitation" },
        { status: 500 }
      );
    }

    if (!invitation) {
      console.log("[INVITE-REDEEM] Invalid invitation code");
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.log("[INVITE-REDEEM] Invitation expired");
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if already used
    if (invitation.used_at) {
      console.log("[INVITE-REDEEM] Invitation already used");
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Manual creation approach - create profile and membership BEFORE auth user
    // This prevents trigger conflicts
    const initialLevel = invitation.initial_level || 'basic';
    const newUserId = crypto.randomUUID();
    
    console.log("[INVITE-REDEEM] Creating user manually (Step 1: Profile)");
    const { error: profileCreateError } = await sb.from("profiles").insert({
      id: newUserId,
      email: email.toLowerCase().trim(),
      full_name: full_name,
      role: 'user'
    });

    if (profileCreateError) {
      console.error("[INVITE-REDEEM] Profile creation error:", profileCreateError);
      
      // Check if user already exists
      if (profileCreateError.code === '23505') {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    console.log("[INVITE-REDEEM] Creating user manually (Step 2: Membership)");
    const { error: membershipCreateError } = await sb.from("user_memberships").insert({
      user_id: newUserId,
      level: initialLevel,
      total_impact_points: 0,
      invite_quota_monthly: getQuotaForLevel(initialLevel),
      invites_used_this_month: 0,
      quota_reset_at: getNextMonthStart()
    });

    if (membershipCreateError) {
      console.error("[INVITE-REDEEM] Membership creation error:", membershipCreateError);
      // Clean up profile
      await sb.from("profiles").delete().eq("id", newUserId);
      return NextResponse.json(
        { error: "Failed to create membership" },
        { status: 500 }
      );
    }

    console.log("[INVITE-REDEEM] Creating user manually (Step 3: Auth User)");
    const { data: createUserData, error: createUserError } = await sb.auth.admin.createUser({
      id: newUserId,
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name
      }
    });

    if (createUserError) {
      console.error("[INVITE-REDEEM] Auth user creation error:", createUserError);
      // Clean up profile and membership
      await sb.from("user_memberships").delete().eq("user_id", newUserId);
      await sb.from("profiles").delete().eq("id", newUserId);
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 500 }
      );
    }

    const authData = createUserData;
    console.log("[INVITE-REDEEM] User, profile, and membership created successfully:", newUserId);

    // Award +1 IP to inviter (user who created the invitation)
    if (invitation.created_by) {
      console.log("[INVITE-REDEEM] Awarding IP to inviter:", invitation.created_by);
      try {
        await addImpactPoints(
          invitation.created_by,
          1,
          'invite_signup',
          `Friend signed up using invite code`,
          authData.user.id
        );
      } catch (ipError) {
        console.error("[INVITE-REDEEM] Failed to award IP:", ipError);
        // Don't fail the request
      }
    }

    // Update invitation with real user ID and mark as used
    console.log("[INVITE-REDEEM] Marking invitation as used with real user ID");
    const { error: invitationUpdateError } = await sb
      .from("invitation_codes")
      .update({
        used_at: new Date().toISOString(),
        used_by: authData.user.id,
        is_active: false
      })
      .eq("id", invitation.id);

    if (invitationUpdateError) {
      console.error("[INVITE-REDEEM] Failed to update invitation:", invitationUpdateError);
      // Don't fail the request
    }

    // signUp already returns a session if successful
    console.log("[INVITE-REDEEM] Checking session from signUp");
    
    if (authData.session) {
      console.log("[INVITE-REDEEM] Session available from signUp");
      return NextResponse.json({
        success: true,
        autoSignedIn: true,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token
        },
        user: {
          id: authData.user.id,
          email: authData.user.email,
          initial_level: initialLevel
        }
      });
    } else {
      console.log("[INVITE-REDEEM] No session from signUp, user needs to log in");
      return NextResponse.json({
        success: true,
        autoSignedIn: false,
        message: "Account created successfully. Please log in.",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          initial_level: initialLevel
        }
      });
    }

  } catch (error: any) {
    console.error("[INVITE-REDEEM] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions
function getQuotaForLevel(level: string): number {
  const quotas: Record<string, number> = {
    'requester': 0,
    'basic': 2,
    'brons': 5,
    'silver': 12,
    'guld': 50,
    'admin': 999999
  };
  return quotas[level] || 2;
}

function getNextMonthStart(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}
