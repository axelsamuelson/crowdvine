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

    // Check if user already exists
    console.log("[INVITE-REDEEM] Checking if user exists");
    const { data: existingUser } = await sb.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === email.toLowerCase().trim());
    
    if (userExists) {
      console.log("[INVITE-REDEEM] User already exists");
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 400 }
      );
    }

    // Create user account
    console.log("[INVITE-REDEEM] Creating user account");
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: password,
      email_confirm: true, // Skip email confirmation for invited users
      user_metadata: {
        full_name: full_name
      }
    });

    if (authError) {
      console.error("[INVITE-REDEEM] Auth error:", {
        error: authError,
        message: authError.message,
        status: authError.status,
        code: authError.code
      });
      
      const errorMsg = authError.message?.includes('already registered')
        ? "An account with this email already exists. Please sign in instead."
        : authError.message || "Failed to create account";
      
      return NextResponse.json(
        { error: errorMsg },
        { status: 400 }
      );
    }

    if (!authData.user) {
      console.error("[INVITE-REDEEM] No user returned from auth");
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    console.log("[INVITE-REDEEM] User created:", authData.user.id);

    // Create profile
    console.log("[INVITE-REDEEM] Creating profile");
    const { error: profileError } = await sb.from("profiles").insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      full_name: full_name,
      role: 'user'
    });

    if (profileError) {
      console.error("[INVITE-REDEEM] Profile error:", profileError);
      // Don't fail - profile might already exist from trigger
    }

    // Create membership with initial_level from invitation
    const initialLevel = invitation.initial_level || 'basic';
    console.log("[INVITE-REDEEM] Creating membership with level:", initialLevel);
    
    const { error: membershipError } = await sb.from("user_memberships").insert({
      user_id: authData.user.id,
      level: initialLevel,
      total_impact_points: 0,
      invite_quota_monthly: getQuotaForLevel(initialLevel),
      invites_used_this_month: 0,
      quota_reset_at: getNextMonthStart()
    });

    if (membershipError) {
      console.error("[INVITE-REDEEM] Membership error:", membershipError);
      return NextResponse.json(
        { error: "Failed to create membership" },
        { status: 500 }
      );
    }

    console.log("[INVITE-REDEEM] Membership created successfully");

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

    // Mark invitation as used
    console.log("[INVITE-REDEEM] Marking invitation as used");
    const { error: updateError } = await sb
      .from("invitation_codes")
      .update({
        used_at: new Date().toISOString(),
        used_by: authData.user.id,
        is_active: false
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("[INVITE-REDEEM] Failed to update invitation:", updateError);
      // Don't fail the request
    }

    // Create session for auto sign-in
    console.log("[INVITE-REDEEM] Creating session for auto sign-in");
    const { data: sessionData, error: sessionError } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email: email.toLowerCase().trim(),
    });

    if (sessionError || !sessionData) {
      console.error("[INVITE-REDEEM] Session creation error:", sessionError);
      // Return success but without auto sign-in
      return NextResponse.json({
        success: true,
        autoSignedIn: false,
        message: "Account created successfully",
        user: {
          id: authData.user.id,
          email: authData.user.email,
          initial_level: initialLevel
        }
      });
    }

    // Try to create session
    try {
      const { data: session } = await sb.auth.setSession({
        access_token: sessionData.properties.access_token,
        refresh_token: sessionData.properties.refresh_token
      });

      console.log("[INVITE-REDEEM] Session created successfully");

      return NextResponse.json({
        success: true,
        autoSignedIn: true,
        session: {
          access_token: sessionData.properties.access_token,
          refresh_token: sessionData.properties.refresh_token
        },
        user: {
          id: authData.user.id,
          email: authData.user.email,
          initial_level: initialLevel
        }
      });
    } catch (setSessionError) {
      console.error("[INVITE-REDEEM] Set session error:", setSessionError);
      
      return NextResponse.json({
        success: true,
        autoSignedIn: false,
        message: "Account created successfully",
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
