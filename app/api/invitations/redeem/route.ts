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

    // Create user account first (trigger will create basic membership)
    console.log("[INVITE-REDEEM] Creating user account via signUp");
    const { data: signUpData, error: signUpError } = await sb.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: {
          full_name: full_name
        }
      }
    });

    if (signUpError) {
      console.error("[INVITE-REDEEM] SignUp error:", {
        error: signUpError,
        message: signUpError.message,
        status: signUpError.status,
        code: signUpError.code
      });
      
      const errorMsg = signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')
        ? "An account with this email already exists. Please sign in instead."
        : signUpError.message || "Failed to create account";
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    if (!signUpData.user) {
      console.error("[INVITE-REDEEM] No user returned from signUp");
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const authData = signUpData;
    console.log("[INVITE-REDEEM] User created:", authData.user.id);

    // Update profile with full_name (profile created by trigger)
    console.log("[INVITE-REDEEM] Updating profile with full_name");
    const { error: profileError } = await sb.from("profiles").upsert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: full_name,
      role: 'user'
    }, {
      onConflict: 'id'
    });

    if (profileError) {
      console.error("[INVITE-REDEEM] Profile update error:", profileError);
      // Don't fail - profile might already have correct data
    }

    // Trigger created basic membership - now update to correct level if needed
    const initialLevel = invitation.initial_level || 'basic';
    console.log("[INVITE-REDEEM] Updating membership to level:", initialLevel);
    
    // Wait briefly for trigger to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update membership to correct level from invitation
    const { data: membershipUpdate, error: membershipUpdateError } = await sb
      .from("user_memberships")
      .update({
        level: initialLevel,
        invite_quota_monthly: getQuotaForLevel(initialLevel),
      })
      .eq("user_id", authData.user.id)
      .select("level, invite_quota_monthly")
      .maybeSingle();
    
    if (membershipUpdateError || !membershipUpdate) {
      console.error("[INVITE-REDEEM] Failed to update membership:", membershipUpdateError);
      // Fallback: create membership manually
      console.log("[INVITE-REDEEM] Creating membership manually as fallback");
      await sb.from("user_memberships").insert({
        user_id: authData.user.id,
        level: initialLevel,
        total_impact_points: 0,
        invite_quota_monthly: getQuotaForLevel(initialLevel),
        invites_used_this_month: 0,
        quota_reset_at: getNextMonthStart()
      });
    } else {
      console.log("[INVITE-REDEEM] Membership updated successfully:", membershipUpdate);
    }

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
