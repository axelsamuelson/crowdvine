import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    console.log("=== FORGOT PASSWORD START ===");
    console.log("Email:", email);

    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists in auth.users
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return NextResponse.json(
        { error: "Failed to check user" },
        { status: 500 },
      );
    }

    const authUser = authUsers.users.find(
      (user) => user.email === normalizedEmail,
    );

    if (!authUser) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, you will receive password reset instructions.",
      });
    }

    // Check if user has access (profile exists with access_granted_at)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("access_granted_at")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json(
        { error: "Failed to check user access" },
        { status: 500 },
      );
    }

    if (!profile?.access_granted_at) {
      // User exists but doesn't have access
      return NextResponse.json({
        success: true,
        message:
          "If an account with that email exists, you will receive password reset instructions.",
      });
    }

    // Generate a secure random password
    const newPassword = generateSecurePassword();

    // Update user password
    const { data: updateData, error: updateError } =
      await supabase.auth.admin.updateUserById(authUser.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        {
          error: "Failed to reset password",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    // Send email with new password (you can implement this with your email service)
    console.log("Password reset successful for:", normalizedEmail);
    console.log("New password:", newPassword); // In production, send this via email

    console.log("=== FORGOT PASSWORD END ===");

    return NextResponse.json({
      success: true,
      message:
        "Password has been reset. Please check your email for the new password.",
      // In development, include the password for testing
      ...(process.env.NODE_ENV === "development" && { newPassword }),
    });
  } catch (error) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

function generateSecurePassword(): string {
  const length = 12;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";

  // Ensure at least one character from each category
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";

  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}
