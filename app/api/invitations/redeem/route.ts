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

    // OPTION C: Manual Creation (Triggers Dropped via Migration 038)
    // After running migration 038, triggers are disabled
    // We create everything manually in the correct order
    
    const initialLevel = invitation.initial_level || 'basic';
    
    console.log("[INVITE-REDEEM] MANUAL CREATION FLOW - Step 1: Create auth.users");
    const { data: createUserData, error: createUserError } = await sb.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name
      }
    });

    if (createUserError) {
      console.error("[INVITE-REDEEM] STEP-1 FAILED - admin.createUser error:", {
        error: createUserError,
        code: createUserError.code,
        message: createUserError.message,
        status: createUserError.status,
        name: createUserError.name
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
          error: "Failed to create auth user",
          details: createUserError.message,
          code: createUserError.code
        },
        { status: 500 }
      );
    }

    if (!createUserData?.user) {
      console.error("[INVITE-REDEEM] STEP-1 FAILED - No user returned");
      return NextResponse.json(
        { error: "No user returned from createUser" },
        { status: 500 }
      );
    }

    const userId = createUserData.user.id;
    console.log("[INVITE-REDEEM] STEP-1 SUCCESS - User created:", userId);
    
    // Step 2: Manually create profile (triggers are disabled)
    console.log("[INVITE-REDEEM] MANUAL CREATION FLOW - Step 2: Create profile");
    const { error: profileError } = await sb.from("profiles").insert({
      id: userId,
      email: email.toLowerCase().trim(),
      full_name: full_name,
      role: 'user'
    });

    if (profileError) {
      console.error("[INVITE-REDEEM] STEP-2 FAILED - Profile creation error:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        userId: userId,
        email: email
      });
      
      // Profile might already exist from old trigger or previous attempt
      if (profileError.code === '23505') {
        console.log("[INVITE-REDEEM] STEP-2 SKIP - Profile already exists (likely from trigger)");
      } else {
        return NextResponse.json(
          { 
            error: "Failed to create profile",
            details: profileError.message,
            code: profileError.code
          },
          { status: 500 }
        );
      }
    } else {
      console.log("[INVITE-REDEEM] STEP-2 SUCCESS - Profile created");
    }
    
    // Step 3: Manually create membership
    console.log("[INVITE-REDEEM] MANUAL CREATION FLOW - Step 3: Create membership with level:", initialLevel);
    const { error: membershipError } = await sb.from("user_memberships").insert({
      user_id: userId,
      level: initialLevel,
      total_impact_points: 0,
      invite_quota_monthly: getQuotaForLevel(initialLevel),
      invites_used_this_month: 0,
      quota_reset_at: getNextMonthStart()
    });

    if (membershipError) {
      console.error("[INVITE-REDEEM] STEP-3 FAILED - Membership creation error:", {
        error: membershipError,
        code: membershipError.code,
        message: membershipError.message,
        details: membershipError.details,
        hint: membershipError.hint,
        userId: userId,
        initialLevel: initialLevel
      });
      
      // Membership might already exist
      if (membershipError.code === '23505') {
        console.log("[INVITE-REDEEM] STEP-3 SKIP - Membership already exists, updating instead");
        
        // Try to update existing membership
        await sb.from("user_memberships").update({
          level: initialLevel,
          invite_quota_monthly: getQuotaForLevel(initialLevel)
        }).eq("user_id", userId);
        
        console.log("[INVITE-REDEEM] STEP-3 SUCCESS - Membership updated");
      } else {
        return NextResponse.json(
          { 
            error: "Failed to create membership",
            details: membershipError.message,
            code: membershipError.code
          },
          { status: 500 }
        );
      }
    } else {
      console.log("[INVITE-REDEEM] STEP-3 SUCCESS - Membership created");
    }

    const authData = createUserData;
    console.log("[INVITE-REDEEM] All manual creation steps completed successfully");

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
