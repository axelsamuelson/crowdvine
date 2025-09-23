import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Create profile directly
    const { data, error } = await supabase.from("profiles").insert({
      id: userId,
      email: email.toLowerCase().trim(),
      role: "user",
      access_granted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating profile:", error);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 },
      );
    }

    // Profile created successfully
    const response = NextResponse.json({
      success: true,
      message: "Profile created successfully",
      data: data,
    });

    // Set access cookie so user can access the app
    response.cookies.set("cv-access", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error("Create profile API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
