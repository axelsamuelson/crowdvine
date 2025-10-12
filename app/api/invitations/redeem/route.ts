import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { addImpactPoints } from "@/lib/membership/points-engine";
import { clearCartId } from "@/src/lib/cookies";

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
    
    // Clear cart cookie to ensure new user gets empty cart
    console.log("[INVITE-REDEEM] Clearing cart cookie for new user");
    await clearCartId();
    
    // Step 3: Manually create membership
    console.log("[INVITE-REDEEM] MANUAL CREATION FLOW - Step 3: Create membership with level:", initialLevel);
    const { error: membershipError } = await sb.from("user_memberships").insert({
      user_id: userId,
      level: initialLevel,
      impact_points: 0,
      invite_quota_monthly: getQuotaForLevel(initialLevel),
      invites_used_this_month: 0,
      last_quota_reset: new Date().toISOString()
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
    let ipAwardStatus = { success: false, pointsBefore: 0, pointsAfter: 0, eventLogged: false };
    
    if (invitation.created_by) {
      console.log("[INVITE-REDEEM] Step 5: Awarding +1 IP to inviter:", invitation.created_by);
      console.log("[INVITE-REDEEM] New user ID:", authData.user.id);
      
      try {
        // Update inviter's impact points directly
        const { data: currentPoints, error: fetchError } = await sb
          .from("user_memberships")
          .select("impact_points, level")
          .eq("user_id", invitation.created_by)
          .single();

        if (fetchError) {
          console.error("[INVITE-REDEEM] STEP-5A FAILED - Failed to fetch inviter membership:", {
            error: fetchError,
            code: fetchError.code,
            message: fetchError.message,
            inviterId: invitation.created_by
          });
        } else if (!currentPoints) {
          console.error("[INVITE-REDEEM] STEP-5A FAILED - No membership found for inviter:", invitation.created_by);
        } else {
          console.log("[INVITE-REDEEM] STEP-5A SUCCESS - Inviter membership found:", {
            inviterId: invitation.created_by,
            currentPoints: currentPoints.impact_points,
            level: currentPoints.level
          });
          
          ipAwardStatus.pointsBefore = currentPoints.impact_points;
          const newPoints = (currentPoints.impact_points || 0) + 1;
          ipAwardStatus.pointsAfter = newPoints;
          
          const { error: updateError } = await sb
            .from("user_memberships")
            .update({
              impact_points: newPoints
            })
            .eq("user_id", invitation.created_by);

          if (updateError) {
            console.error("[INVITE-REDEEM] STEP-5B FAILED - Failed to update inviter points:", {
              error: updateError,
              code: updateError.code,
              message: updateError.message
            });
          } else {
            console.log("[INVITE-REDEEM] STEP-5B SUCCESS - Inviter points updated:", currentPoints.impact_points, "→", newPoints);
            ipAwardStatus.success = true;
            
            // Verify the update actually happened
            const { data: verifyPoints } = await sb
              .from("user_memberships")
              .select("impact_points")
              .eq("user_id", invitation.created_by)
              .single();
            
            console.log("[INVITE-REDEEM] VERIFICATION - Points after update:", verifyPoints?.impact_points);
          }

          // Log the IP event
          const { data: insertedEvent, error: eventError } = await sb
            .from("impact_point_events")
            .insert({
              user_id: invitation.created_by,
              event_type: 'invite_signup',
              points_earned: 1,
              related_user_id: authData.user.id,
              description: `Friend signed up using invite code`
            })
            .select()
            .single();

          if (eventError) {
            console.error("[INVITE-REDEEM] STEP-5C FAILED - Failed to log IP event:", {
              error: eventError,
              code: eventError.code,
              message: eventError.message,
              details: eventError.details
            });
          } else {
            console.log("[INVITE-REDEEM] STEP-5C SUCCESS - IP event logged:", insertedEvent.id);
            ipAwardStatus.eventLogged = true;
          }
        }
      } catch (ipError) {
        console.error("[INVITE-REDEEM] STEP-5 UNEXPECTED ERROR:", ipError);
        // Don't fail the request
      }
    } else {
      console.warn("[INVITE-REDEEM] No created_by in invitation - skipping IP award");
    }
    
    console.log("[INVITE-REDEEM] IP Award Status:", ipAwardStatus);

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

    // Create session for auto sign-in (admin.createUser doesn't return session)
    console.log("[INVITE-REDEEM] Creating session for auto sign-in");
    
    try {
      // Use signInWithPassword to create a valid session
      const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
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
            initial_level: initialLevel
          }
        });
      }

      if (signInData.session) {
        console.log("[INVITE-REDEEM] Session created successfully for auto sign-in");
        return NextResponse.json({
          success: true,
          autoSignedIn: true,
          session: {
            access_token: signInData.session.access_token,
            refresh_token: signInData.session.refresh_token
          },
          user: {
            id: authData.user.id,
            email: authData.user.email,
            initial_level: initialLevel
          }
        });
      }
    } catch (sessionError) {
      console.error("[INVITE-REDEEM] Session creation error:", sessionError);
    }

    // Fallback: No session, user needs to log in
    console.log("[INVITE-REDEEM] No session available, user needs to log in manually");
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

// Helper function removed - last_quota_reset uses NOW() instead of next month start
