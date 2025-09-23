import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, code } = await request.json();

    console.log("Redeem invitation request:", {
      email,
      code: code.substring(0, 10) + "...",
    });

    if (!email || !password || !code) {
      console.error("Missing required fields:", {
        email: !!email,
        password: !!password,
        code: !!code,
      });
      return NextResponse.json(
        { error: "Email, password, and invitation code are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Validate invitation code first
    const { data: invitation, error: invitationError } = await supabase
      .from("invitation_codes")
      .select(
        "id, code, expires_at, max_uses, current_uses, is_active, created_by",
      )
      .eq("code", code)
      .single();

    if (invitationError || !invitation) {
      console.error("Invitation not found:", invitationError);
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 400 },
      );
    }

    // Check if invitation is still valid
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (!invitation.is_active) {
      return NextResponse.json(
        { error: "Invitation code is no longer active" },
        { status: 400 },
      );
    }

    if (expiresAt < now) {
      return NextResponse.json(
        { error: "Invitation code has expired" },
        { status: 400 },
      );
    }

    if (invitation.max_uses && invitation.current_uses >= invitation.max_uses) {
      console.error("Invitation code already used up:", {
        code,
        current_uses: invitation.current_uses,
        max_uses: invitation.max_uses,
      });
      return NextResponse.json(
        { error: "Invitation code has been used up" },
        { status: 400 },
      );
    }

    // Create user account
    console.log("Creating user with email:", email.toLowerCase().trim());
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: email.toLowerCase().trim(),
        password,
        email_confirm: true, // Skip email confirmation for invitation signups
      });

    if (authError || !authData.user) {
      console.error("Create user error:", authError);
      console.error("Auth data:", authData);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 },
      );
    }

    console.log("User created successfully with ID:", authData.user.id);
    console.log("User email:", authData.user.email);

    // Check if profile already exists (in case of duplicate key error)
    console.log("Checking if profile already exists...");
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileCheckError && profileCheckError.code !== "PGRST116") {
      console.error("Profile check error:", profileCheckError);
    } else if (existingProfile) {
      console.log(
        "Profile already exists, updating access and invitation usage",
      );

      // Update profile to grant access if not already granted
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          access_granted_at:
            existingProfile.access_granted_at || new Date().toISOString(),
          invite_code_used: code,
          updated_at: new Date().toISOString(),
        })
        .eq("id", authData.user.id);

      if (profileUpdateError) {
        console.error("Profile update error:", profileUpdateError);
      } else {
        console.log("Profile updated with access granted");
      }

      // Update invitation usage
      const { error: updateError } = await supabase
        .from("invitation_codes")
        .update({
          used_at: new Date().toISOString(),
          used_by: authData.user.id,
          current_uses: invitation.current_uses + 1,
        })
        .eq("id", invitation.id);

      if (updateError) {
        console.error("Update invitation error:", updateError);
      }

      // Always try to create reward discount code, regardless of invitation update status
      // Create initial reward discount code for the inviter (5% for account creation)
      try {
        console.log(
          "Creating reward discount code for inviter (existing profile):",
          invitation.created_by,
        );
        console.log("Invitation ID:", invitation.id);

        // Generate a unique discount code
        const generateDiscountCode = () => {
          return Math.random().toString(36).substring(2, 10).toUpperCase();
        };

        let discountCode = generateDiscountCode();
        let codeExists = true;

        // Ensure code is unique
        while (codeExists) {
          const { data: existingCode } = await supabase
            .from("discount_codes")
            .select("id")
            .eq("code", discountCode)
            .single();

          if (!existingCode) {
            codeExists = false;
          } else {
            discountCode = generateDiscountCode();
          }
        }

        console.log(
          "Generated unique discount code (existing profile):",
          discountCode,
        );

        // Create discount code directly
        const { data: newDiscountCode, error: rewardError } = await supabase
          .from("discount_codes")
          .insert({
            code: discountCode,
            discount_percentage: 5,
            is_active: true,
            usage_limit: 1,
            current_usage: 0,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 30 days
            earned_by_user_id: invitation.created_by,
            earned_for_invitation_id: invitation.id,
          })
          .select()
          .single();

        if (rewardError) {
          console.error(
            "Error creating reward for inviter (existing profile):",
            rewardError,
          );
          console.error(
            "Reward error details:",
            JSON.stringify(rewardError, null, 2),
          );
        } else {
          console.log(
            "Initial reward discount code created for inviter (existing profile):",
            newDiscountCode,
          );
        }
      } catch (rewardError) {
        console.error(
          "Error creating invitation reward (existing profile):",
          rewardError,
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        message:
          "Account created successfully. Please sign in with your credentials.",
      });
    }

    // Create profile with access granted
    console.log("Creating profile for user ID:", authData.user.id);
    console.log("Profile data to insert:", {
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      access_granted_at: new Date().toISOString(),
      invite_code_used: code,
    });

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      email: email.toLowerCase().trim(),
      access_granted_at: new Date().toISOString(),
      invite_code_used: code,
    });

    if (profileError) {
      console.error("Create profile error:", profileError);
      console.error(
        "Profile error details:",
        JSON.stringify(profileError, null, 2),
      );
      console.error("Profile error code:", profileError.code);
      console.error("Profile error message:", profileError.message);
      console.error("Profile error hint:", profileError.hint);

      // Clean up the created user if profile creation fails
      console.log("Cleaning up created user due to profile error...");
      const deleteResult = await supabase.auth.admin.deleteUser(
        authData.user.id,
      );
      console.log("User deletion result:", deleteResult);

      return NextResponse.json(
        {
          error: "Failed to create profile",
          details: profileError.message,
          code: profileError.code,
          hint: profileError.hint,
        },
        { status: 500 },
      );
    }

    console.log("Profile created successfully for user:", authData.user.id);

    // Update invitation usage
    console.log("Updating invitation usage for invitation ID:", invitation.id);
    console.log("Update data:", {
      used_at: new Date().toISOString(),
      used_by: authData.user.id,
      current_uses: invitation.current_uses + 1,
    });

    const { error: updateError } = await supabase
      .from("invitation_codes")
      .update({
        used_at: new Date().toISOString(),
        used_by: authData.user.id, // This should match the profile ID since profiles.id = auth.users.id
        current_uses: invitation.current_uses + 1,
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("Update invitation error:", updateError);
      console.error(
        "Update invitation details:",
        JSON.stringify(updateError, null, 2),
      );
      // Don't fail the signup if we can't update the invitation
    } else {
      console.log("Invitation usage updated successfully");
    }

    // Always try to create reward discount code, regardless of invitation update status
    // Create initial reward discount code for the inviter (5% for account creation)
    try {
      console.log(
        "Creating reward discount code for inviter:",
        invitation.created_by,
      );
      console.log("Invitation ID:", invitation.id);

      // Generate a unique discount code
      const generateDiscountCode = () => {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
      };

      let discountCode = generateDiscountCode();
      let codeExists = true;

      // Ensure code is unique
      while (codeExists) {
        const { data: existingCode } = await supabase
          .from("discount_codes")
          .select("id")
          .eq("code", discountCode)
          .single();

        if (!existingCode) {
          codeExists = false;
        } else {
          discountCode = generateDiscountCode();
        }
      }

      console.log("Generated unique discount code:", discountCode);

      // Create discount code directly
      const { data: newDiscountCode, error: rewardError } = await supabase
        .from("discount_codes")
        .insert({
          code: discountCode,
          discount_percentage: 5,
          is_active: true,
          usage_limit: 1,
          current_usage: 0,
          expires_at: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 30 days
          earned_by_user_id: invitation.created_by,
          earned_for_invitation_id: invitation.id,
        })
        .select()
        .single();

      if (rewardError) {
        console.error("Error creating reward for inviter:", rewardError);
        console.error(
          "Reward error details:",
          JSON.stringify(rewardError, null, 2),
        );
      } else {
        console.log(
          "Initial reward discount code created for inviter:",
          newDiscountCode,
        );
      }
    } catch (rewardError) {
      console.error("Error creating invitation reward:", rewardError);
    }

    // Return success - frontend will handle sign in
    const response = NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      message:
        "Account created successfully. Please sign in with your credentials.",
    });

    // Note: We don't set auth cookies here since the user needs to sign in manually
    // The frontend will redirect to login page

    return response;
  } catch (error) {
    console.error("Redeem invitation error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
