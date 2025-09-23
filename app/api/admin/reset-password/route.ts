import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Find the user by email
    const { data: users, error: listError } =
      await supabase.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return NextResponse.json(
        { error: "Failed to list users" },
        { status: 500 },
      );
    }

    const user = users.users.find(
      (u) => u.email === email.toLowerCase().trim(),
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's password
    const { data: updateData, error: updateError } =
      await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { error: "Failed to update password" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
      user: {
        id: updateData.user.id,
        email: updateData.user.email,
      },
    });
  } catch (error) {
    console.error("Reset admin password error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
