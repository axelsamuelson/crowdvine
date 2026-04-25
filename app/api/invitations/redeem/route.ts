import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { clearCartId } from "@/src/lib/cookies";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";

/**
 * POST /api/invitations/redeem
 *
 * Redeem an invitation code and create a new user account with membership
 */
export async function POST(request: NextRequest) {
  try {
    console.log("[INVITE-REDEEM] Starting redemption process");

    const { invitation_code, email, password, full_name, selected_type, producer_data } =
      await request.json();

    if (!invitation_code || !email || !password || !full_name) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
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
        { status: 500 },
      );
    }

    if (!invitation) {
      console.log("[INVITE-REDEEM] Invalid invitation code");
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 400 },
      );
    }

    const isPersonal = !!(invitation as { is_personal_link?: boolean })
      .is_personal_link;

    // Check if expired (reusable personal links use a far-future expires_at)
    if (!isPersonal && invitation.expires_at) {
      if (new Date(invitation.expires_at) < new Date()) {
        console.log("[INVITE-REDEEM] Invitation expired");
        return NextResponse.json(
          { error: "This invitation has expired" },
          { status: 400 },
        );
      }
    }

    // Check if already used (single-use codes only)
    if (!isPersonal && invitation.used_at) {
      console.log("[INVITE-REDEEM] Invitation already used");
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 },
      );
    }

    // OPTION C: Manual Creation (Triggers Dropped via Migration 038)
    // After running migration 038, triggers are disabled
    // We create everything manually in the correct order

    const initialLevel = invitation.initial_level || "basic";

    console.log(
      "[INVITE-REDEEM] MANUAL CREATION FLOW - Step 1: Create auth.users",
    );
    const { data: createUserData, error: createUserError } =
      await sb.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
        },
      });

    if (createUserError) {
      console.error("[INVITE-REDEEM] STEP-1 FAILED - admin.createUser error:", {
        error: createUserError,
        code: createUserError.code,
        message: createUserError.message,
        status: createUserError.status,
        name: createUserError.name,
      });

      // Check for duplicate user
      if (
        createUserError.message?.includes("already") ||
        createUserError.code === "23505"
      ) {
        return NextResponse.json(
          {
            error:
              "An account with this email already exists. Please sign in instead.",
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error: "Failed to create auth user",
          details: createUserError.message,
          code: createUserError.code,
        },
        { status: 500 },
      );
    }

    if (!createUserData?.user) {
      console.error("[INVITE-REDEEM] STEP-1 FAILED - No user returned");
      return NextResponse.json(
        { error: "No user returned from createUser" },
        { status: 500 },
      );
    }

    const userId = createUserData.user.id;
    console.log("[INVITE-REDEEM] STEP-1 SUCCESS - User created:", userId);

    // Step 2: Manually create profile (triggers are disabled)
    // Set roles and portal_access from invitation_type: consumer, producer, business
    const allowedTypes =
      invitation.allowed_types && invitation.allowed_types.length > 0
        ? invitation.allowed_types
        : invitation.invitation_type === "producer" ||
            invitation.invitation_type === "business"
          ? [invitation.invitation_type]
          : ["consumer"];
    const invitationType =
      invitation.can_change_account_type && selected_type && allowedTypes.includes(selected_type)
        ? selected_type
        : allowedTypes[0] === "producer" || allowedTypes[0] === "business"
          ? allowedTypes[0]
          : "consumer";
    const profileRoles =
      invitationType === "producer" ? ["user", "producer"] : ["user"];
    const portalAccess =
      invitationType === "business" ? ["business"] : ["user"];

    console.log(
      "[INVITE-REDEEM] MANUAL CREATION FLOW - Step 2: Create profile",
      { invitationType, profileRoles, portalAccess },
    );
    const { error: profileError } = await sb.from("profiles").insert({
      id: userId,
      email: email.toLowerCase().trim(),
      full_name: full_name,
      role: "user",
      roles: profileRoles,
      portal_access: portalAccess,
      invite_code_used: String(invitation_code).trim(),
    });

    if (profileError) {
      console.error("[INVITE-REDEEM] STEP-2 FAILED - Profile creation error:", {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        userId: userId,
        email: email,
      });

      // Profile might already exist from old trigger or previous attempt
      if (profileError.code === "23505") {
        console.log(
          "[INVITE-REDEEM] STEP-2 SKIP - Profile already exists (likely from trigger)",
        );
      } else {
        return NextResponse.json(
          {
            error: "Failed to create profile",
            details: profileError.message,
            code: profileError.code,
          },
          { status: 500 },
        );
      }
    } else {
      console.log("[INVITE-REDEEM] STEP-2 SUCCESS - Profile created");
    }

    if (invitation.created_by && isPersonal) {
      const { error: rsErr } = await sb.from("referral_signups").insert({
        inviter_id: invitation.created_by,
        invitee_id: userId,
        personal_invite_code: String(invitation_code).trim().toUpperCase(),
      });
      if (rsErr && rsErr.code !== "23505") {
        console.error("[INVITE-REDEEM] referral_signups insert:", rsErr);
      }
    }

    // Clear cart cookie to ensure new user gets empty cart
    console.log("[INVITE-REDEEM] Clearing cart cookie for new user");
    await clearCartId();

    // Step 3: Manually create membership
    console.log(
      "[INVITE-REDEEM] MANUAL CREATION FLOW - Step 3: Create membership with level:",
      initialLevel,
    );
    const { error: membershipError } = await sb
      .from("user_memberships")
      .insert({
        user_id: userId,
        level: initialLevel,
        impact_points: 0,
        invite_quota_monthly: getQuotaForLevel(initialLevel),
        invites_used_this_month: 0,
        last_quota_reset: new Date().toISOString(),
      });

    if (membershipError) {
      console.error(
        "[INVITE-REDEEM] STEP-3 FAILED - Membership creation error:",
        {
          error: membershipError,
          code: membershipError.code,
          message: membershipError.message,
          details: membershipError.details,
          hint: membershipError.hint,
          userId: userId,
          initialLevel: initialLevel,
        },
      );

      // Membership might already exist
      if (membershipError.code === "23505") {
        console.log(
          "[INVITE-REDEEM] STEP-3 SKIP - Membership already exists, updating instead",
        );

        // Try to update existing membership
        await sb
          .from("user_memberships")
          .update({
            level: initialLevel,
            invite_quota_monthly: getQuotaForLevel(initialLevel),
          })
          .eq("user_id", userId);

        console.log("[INVITE-REDEEM] STEP-3 SUCCESS - Membership updated");
      } else {
        return NextResponse.json(
          {
            error: "Failed to create membership",
            details: membershipError.message,
            code: membershipError.code,
          },
          { status: 500 },
        );
      }
    } else {
      console.log("[INVITE-REDEEM] STEP-3 SUCCESS - Membership created");
    }

    // Step 3b: For producer invitations, create a producer and link to profile
    if (invitationType === "producer") {
      console.log(
        "[INVITE-REDEEM] MANUAL CREATION FLOW - Step 3b: Create producer and link profile",
      );
      const pd = producer_data && typeof producer_data === "object" ? producer_data : {};
      const { data: newProducer, error: producerError } = await sb
        .from("producers")
        .insert({
          name: pd.name ?? full_name,
          region: pd.region ?? "",
          lat: pd.lat ?? 0,
          lon: pd.lon ?? 0,
          country_code: pd.country_code ?? "",
          address_street: pd.address_street ?? "",
          address_city: pd.address_city ?? "",
          address_postcode: pd.address_postcode ?? "",
          short_description: pd.short_description ?? "",
          logo_image_path: pd.logo_image_path ?? "",
          pickup_zone_id: null,
          owner_id: userId,
          status: "active",
        })
        .select("id")
        .single();

      if (producerError) {
        console.error(
          "[INVITE-REDEEM] STEP-3B FAILED - Producer creation error:",
          producerError,
        );
        return NextResponse.json(
          {
            error: "Failed to create producer profile",
            details: producerError.message,
          },
          { status: 500 },
        );
      }

      if (newProducer?.id) {
        const { error: profileUpdateError } = await sb
          .from("profiles")
          .update({
            producer_id: newProducer.id,
            role: "producer",
          })
          .eq("id", userId);

        if (profileUpdateError) {
          console.error(
            "[INVITE-REDEEM] STEP-3B FAILED - Profile producer_id update:",
            profileUpdateError,
          );
          return NextResponse.json(
            {
              error: "Failed to link producer to account",
              details: profileUpdateError.message,
            },
            { status: 500 },
          );
        }
        console.log(
          "[INVITE-REDEEM] STEP-3B SUCCESS - Producer created and linked:",
          newProducer.id,
        );
      }
    }

    const authData = createUserData;
    console.log(
      "[INVITE-REDEEM] All manual creation steps completed successfully",
    );

    // NOTE: Inviter rewards now happen on invitee's first order, not signup.
    // See awardPactPointsForInviteFirstOrder in checkout/confirm.

    // Update invitation with real user ID and mark as used (single-use only)
    if (!isPersonal) {
      console.log("[INVITE-REDEEM] Marking invitation as used with real user ID");
      const { error: invitationUpdateError } = await sb
        .from("invitation_codes")
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
          is_active: false,
        })
        .eq("id", invitation.id);

      if (invitationUpdateError) {
        console.error(
          "[INVITE-REDEEM] Failed to update invitation:",
          invitationUpdateError,
        );
        // Don't fail the request
      }
    } else {
      console.log(
        "[INVITE-REDEEM] Personal invite pool — leaving master invitation row active",
      );
    }

    void logUserEventServer({
      userId: authData.user.id,
      eventType: "invitation_signup_completed",
      eventCategory: "invitation",
      metadata: {
        invitation_id: invitation.id,
        initial_level: initialLevel,
      },
    });

    // Create session for auto sign-in (admin.createUser doesn't return session)
    console.log("[INVITE-REDEEM] Creating session for auto sign-in");

    try {
      // Use signInWithPassword to create a valid session
      const { data: signInData, error: signInError } =
        await sb.auth.signInWithPassword({
          email: email.toLowerCase().trim(),
          password: password,
        });

      if (signInError) {
        console.error("[INVITE-REDEEM] Sign-in failed:", signInError);
        // Return success but user needs to log in manually
        return NextResponse.json({
          success: true,
          autoSignedIn: false,
          message: "Account created successfully. Please log in.",
          user: {
            id: authData.user.id,
            email: authData.user.email,
            initial_level: initialLevel,
          },
        });
      }

      if (signInData.session) {
        console.log(
          "[INVITE-REDEEM] Session created successfully for auto sign-in",
        );
        return NextResponse.json({
          success: true,
          autoSignedIn: true,
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token,
          },
          user: {
            id: authData.user.id,
            email: authData.user.email,
            initial_level: initialLevel,
          },
        });
      }
    } catch (sessionError) {
      console.error("[INVITE-REDEEM] Session creation error:", sessionError);
    }

    // Fallback: No session, user needs to log in
    console.log(
      "[INVITE-REDEEM] No session available, user needs to log in manually",
    );
    return NextResponse.json({
      success: true,
      autoSignedIn: false,
      message: "Account created successfully. Please log in.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        initial_level: initialLevel,
      },
    });
  } catch (error: unknown) {
    console.error("[INVITE-REDEEM] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

// Helper functions
function getQuotaForLevel(level: string): number {
  const quotas: Record<string, number> = {
    requester: 0,
    basic: 2,
    brons: 5,
    silver: 12,
    guld: 50,
    privilege: 100,
    admin: 999999,
  };
  return quotas[level] || 2;
}

// Helper function removed - last_quota_reset uses NOW() instead of next month start
