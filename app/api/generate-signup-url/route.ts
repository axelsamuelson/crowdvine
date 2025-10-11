import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // Check if user has approved access request and get initial_level
    const { data: accessRequest, error: accessError } = await adminSupabase
      .from("access_requests")
      .select("status, initial_level")
      .eq("email", email.toLowerCase().trim())
      .eq("status", "approved")
      .single();

    if (accessError || !accessRequest) {
      return NextResponse.json({
        success: false,
        message: "No approved access request found for this email",
      });
    }

    // Generate a unique access token
    const accessToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Store the access token with initial_level
    const { error: tokenError } = await adminSupabase
      .from("access_tokens")
      .insert({
        token: accessToken,
        email: email.toLowerCase().trim(),
        expires_at: expiresAt.toISOString(),
        used: false,
        initial_level: accessRequest.initial_level || 'basic',
      });

    if (tokenError) {
      console.error("Error storing access token:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate access token" },
        { status: 500 },
      );
    }

    // Generate signup URL with token
    // IMPORTANT: Trim baseUrl to remove any whitespace/newlines from environment variable
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com").trim();
    const signupUrl = `${baseUrl}/signup?token=${accessToken}`;

    return NextResponse.json({
      success: true,
      signupUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Generate signup URL API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
