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

    // OPTION B: Let triggers work, then update to correct level
    const initialLevel = invitation.initial_level || 'basic';
    
    console.log("[INVITE-REDEEM] Step 1: Creating auth user with admin.createUser");
    console.log("[INVITE-REDEEM] This will trigger automatic profile and membership creation");
    
    const { data: createUserData, error: createUserError } = await sb.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name
      }
    });

    if (createUserError) {
      console.error("[INVITE-REDEEM] admin.createUser failed:", {
        error: createUserError,
        code: createUserError.code,
        message: createUserError.message,
        status: createUserError.status
      });
      
      // Check for duplicate user
      if (createUserError.message?.includes('already') || createUserError.code === '23505') {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in instead." },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create account",
          details: createUserError.message 
        },
        { status: 500 }
      );
    }

    if (!createUserData?.user) {
      console.error("[INVITE-REDEEM] No user returned from admin.createUser");
      return NextResponse.json(
        { error: "Failed to create account - no user returned" },
        { status: 500 }
      );
    }

    const authData = createUserData;
    const userId = authData.user.id;
    console.log("[INVITE-REDEEM] User created by admin.createUser:", userId);
    
    // Step 2: Wait for triggers to complete
    console.log("[INVITE-REDEEM] Step 2: Waiting for triggers to complete");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Step 3: Update profile with full_name (trigger might not have set it)
    console.log("[INVITE-REDEEM] Step 3: Updating profile with full_name");
    await sb.from("profiles").update({
      full_name: full_name
    }).eq("id", userId);
    
    // Step 4: Update membership to correct initial_level from invitation
    console.log("[INVITE-REDEEM] Step 4: Updating membership to level:", initialLevel);
    const { data: membershipUpdate, error: membershipUpdateError } = await sb
      .from("user_memberships")
      .update({
        level: initialLevel,
        invite_quota_monthly: getQuotaForLevel(initialLevel)
      })
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    
    if (membershipUpdateError) {
      console.error("[INVITE-REDEEM] Membership update failed:", membershipUpdateError);
      console.log("[INVITE-REDEEM] Attempting to create membership manually");
      
      // Fallback: Create membership if it doesn't exist
      const { error: membershipInsertError } = await sb.from("user_memberships").insert({
        user_id: userId,
        level: initialLevel,
        total_impact_points: 0,
        invite_quota_monthly: getQuotaForLevel(initialLevel),
        invites_used_this_month: 0,
        quota_reset_at: getNextMonthStart()
      });
      
      if (membershipInsertError) {
        console.error("[INVITE-REDEEM] Membership insert also failed:", membershipInsertError);
        return NextResponse.json(
          { 
            error: "Failed to create membership",
            details: membershipInsertError.message,
            code: membershipInsertError.code
          },
          { status: 500 }
        );
      }
      
      console.log("[INVITE-REDEEM] Membership created manually");
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
