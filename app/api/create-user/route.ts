import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";

export async function POST(request: NextRequest) {
  try {
    console.log("=== CREATE USER API START ===");

    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    if (!signupLimiter.isAllowed(clientId)) {
      const resetTime = signupLimiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      console.log("Rate limit exceeded for client:", clientId);
      return NextResponse.json(
        {
          error: "Too many signup attempts. Please try again later.",
          retryAfter: retryAfter,
          resetTime: new Date(resetTime).toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetTime.toString(),
          },
        },
      );
    }

    const { email, password, userId } = await request.json();
    console.log("Request data:", { email, hasPassword: !!password, userId });

    if (!email || !password) {
      console.log("Missing required fields:", {
        email: !!email,
        password: !!password,
      });
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();
    console.log("Normalized email:", normalizedEmail);

    // Step 1: Check if user already exists in auth.users
    console.log("1. Checking if user exists in auth.users...");

    // Try to get user by email using the old API
    let existingUserData = null;
    let userCheckError = null;

    try {
      // Use the old API method that should still work
      const result = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (result.data && result.data.users) {
        existingUserData = result.data.users.find(
          (user) => user.email === normalizedEmail,
        );
        console.log(
          "2a. User search result:",
          existingUserData ? "Found" : "Not found",
        );
      }
    } catch (error) {
      console.error("Error checking existing user:", error);
      userCheckError = error;
    }

    if (userCheckError) {
      console.error("Error checking existing user:", userCheckError);
      return NextResponse.json(
        {
          error: "Failed to check existing user",
          details: userCheckError.message,
          code: userCheckError.status || "unknown",
        },
        { status: 500 },
      );
    }

    let authUserId: string;

    if (existingUserData) {
      authUserId = existingUserData.id;
      console.log("2a. User already exists in auth.users:", authUserId);

      // Check if user already has a profile with access
      console.log("2b. Checking existing profile...");
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("access_granted_at")
        .eq("id", authUserId)
        .maybeSingle();

      if (profileCheckError) {
        console.error("Error checking existing profile:", profileCheckError);
        return NextResponse.json(
          {
            error: "Failed to check existing profile",
            details: profileCheckError.message,
            code: profileCheckError.code || "unknown",
          },
          { status: 500 },
        );
      }

      if (existingProfile?.access_granted_at) {
        console.log("2c. User already has access, returning success");
        return NextResponse.json({
          success: true,
          message: "User already has access to the platform",
          user: {
            id: authUserId,
            email: normalizedEmail,
          },
        });
      }

      // User exists but no profile with access - create/update profile
      console.log("2d. Creating/updating profile for existing user...");
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: authUserId,
        email: normalizedEmail,
        role: "user",
        access_granted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error("Error creating/updating profile:", profileError);
        return NextResponse.json(
          {
            error: "Failed to create profile",
            details: profileError.message,
            code: profileError.code || "unknown",
          },
          { status: 500 },
        );
      }

      console.log("2e. Profile created/updated successfully");
    } else {
      // Step 2: Create new user
      console.log("3a. Creating new user...");
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true, // Skip email verification
        });

      if (authError) {
        console.error("Error creating user:", authError);
        return NextResponse.json(
          {
            error: "Failed to create user",
            details: authError.message,
            code: authError.status || "unknown",
            debug: {
              email: normalizedEmail,
              hasPassword: !!password,
              errorType: "auth_creation_failed",
            },
          },
          { status: 500 },
        );
      }

      if (!authData || !authData.user) {
        console.error("User creation returned no user data");
        return NextResponse.json(
          {
            error: "User creation failed",
            details: "No user data returned from auth creation",
            debug: {
              email: normalizedEmail,
              authData: authData,
            },
          },
          { status: 500 },
        );
      }

      authUserId = authData.user.id;
      console.log("3b. New user created:", authUserId);

      // Step 3: Check if profile already exists and create/update it
      console.log("3c. Checking if profile already exists...");
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id, access_granted_at")
        .eq("id", authUserId)
        .maybeSingle();

      if (profileCheckError) {
        console.error("Error checking existing profile:", profileCheckError);
        return NextResponse.json(
          {
            error: "Failed to check existing profile",
            details: profileCheckError.message,
            code: profileCheckError.code || "unknown",
          },
          { status: 500 },
        );
      }

      if (existingProfile?.access_granted_at) {
        console.log(
          "3c1. Profile already exists with access, skipping creation",
        );
      } else {
        console.log("3c2. Creating/updating profile for new user...");
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: authUserId,
            email: normalizedEmail,
            role: "user",
            access_granted_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
            ignoreDuplicates: false, // Update existing records
          },
        );

        if (profileError) {
          console.error("Error creating/updating profile:", profileError);
          console.error("Profile error details:", {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint,
          });
          return NextResponse.json(
            {
              error: "Failed to create profile",
              details: profileError.message,
              code: profileError.code || "unknown",
              debug: {
                authUserId: authUserId,
                email: normalizedEmail,
                errorType: "profile_creation_failed",
                errorDetails: profileError.details,
                errorHint: profileError.hint,
              },
            },
            { status: 500 },
          );
        }

        console.log("3d. Profile created/updated successfully");
      }
    }

    // Step 4: Clean up any remaining access requests for this email
    console.log("4. Cleaning up access requests...");
    const { error: cleanupError } = await supabase
      .from("access_requests")
      .delete()
      .eq("email", normalizedEmail);

    if (cleanupError) {
      console.error("Error cleaning up access requests:", cleanupError);
      // Don't fail the request for cleanup errors
    } else {
      console.log("4b. Access requests cleaned up");
    }

    // User and profile created/updated successfully
    console.log("5. User creation completed successfully");

    // Automatically sign in the user after successful account creation
    console.log("6. Creating auth session for new user...");
    try {
      // Create a server client for signing in
      const serverSupabase = createSupabaseServerClient();
      
      // CRITICAL SECURITY: Clear any existing sessions before signing in the new user
      // This prevents users from being logged into the wrong account
      console.log("Clearing existing sessions for security...");
      await serverSupabase.auth.signOut({ scope: "global" });
      
      const { data: signInData, error: signInError } = await serverSupabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        console.error("Auto sign-in failed:", signInError);
        return NextResponse.json({
          success: true,
          user: {
            id: authUserId,
            email: normalizedEmail,
          },
          autoSignedIn: false,
          message: "Account created successfully. Please sign in.",
        });
      }

      // CRITICAL SECURITY: Verify that the signed-in user matches the created user
      if (signInData.user?.id !== authUserId) {
        console.error("SECURITY ALERT: Signed-in user ID does not match created user ID!");
        console.error("Created user ID:", authUserId);
        console.error("Signed-in user ID:", signInData.user?.id);
        
        // Sign out immediately for security
        await serverSupabase.auth.signOut({ scope: "global" });
        
        return NextResponse.json({
          success: false,
          error: "Security validation failed. Please try signing in manually.",
        }, { status: 500 });
      }

      console.log("6a. User automatically signed in successfully");
      
      // Update response to indicate auto sign-in
      const updatedResponse = NextResponse.json({
        success: true,
        user: {
          id: signInData.user?.id,
          email: signInData.user?.email,
        },
        autoSignedIn: true,
        message: "Account created and signed in successfully.",
      });

      // Copy cookies from the server client to the response
      const cookies = await serverSupabase.auth.getSession();
      // The cookies are automatically set by the server client
      
      return updatedResponse;
    } catch (sessionError) {
      console.error("Error creating auth session:", sessionError);
      // Return success but indicate manual sign-in required
      return NextResponse.json({
        success: true,
        user: {
          id: authUserId,
          email: normalizedEmail,
        },
        autoSignedIn: false,
        message: "Account created successfully. Please sign in.",
      });
    }

    console.log("=== CREATE USER API END ===");
  } catch (error) {
    console.error("=== CREATE USER API ERROR ===");
    console.error("Unexpected error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
        debug: {
          errorType: "unexpected_error",
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 },
    );
  }
}
