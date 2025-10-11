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
    // Try to get initial_level but fall back gracefully if column doesn't exist yet
    let initialLevel = 'basic';
    const { data: accessRequest, error: accessError } = await adminSupabase
      .from("access_requests")
      .select("status, initial_level")
      .eq("email", email.toLowerCase().trim())
      .eq("status", "approved")
      .single();

    if (accessError || !accessRequest) {
      // If the error is about initial_level column not existing, try without it
      if (accessError?.message?.includes('initial_level')) {
        console.log("DEBUG: initial_level column not found, trying without it...");
        const { data: fallbackRequest, error: fallbackError } = await adminSupabase
          .from("access_requests")
          .select("status")
          .eq("email", email.toLowerCase().trim())
          .eq("status", "approved")
          .single();
        
        if (fallbackError || !fallbackRequest) {
          return NextResponse.json({
            success: false,
            message: "No approved access request found for this email",
          });
        }
        // Use default level if column doesn't exist
        initialLevel = 'basic';
      } else {
        return NextResponse.json({
          success: false,
          message: "No approved access request found for this email",
        });
      }
    } else {
      // Column exists, use the value
      initialLevel = accessRequest.initial_level || 'basic';
    }

    // Generate a unique access token
    const accessToken = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Store the access token with initial_level
    // Try with initial_level first, fall back without it if column doesn't exist
    let tokenError = null;
    try {
      const result = await adminSupabase
        .from("access_tokens")
        .insert({
          token: accessToken,
          email: email.toLowerCase().trim(),
          expires_at: expiresAt.toISOString(),
          used: false,
          initial_level: initialLevel,
        });
      tokenError = result.error;
    } catch (err: any) {
      // If initial_level column doesn't exist, try without it
      if (err?.message?.includes('initial_level') || tokenError?.message?.includes('initial_level')) {
        console.log("DEBUG: initial_level column not found in access_tokens, inserting without it...");
        const result = await adminSupabase
          .from("access_tokens")
          .insert({
            token: accessToken,
            email: email.toLowerCase().trim(),
            expires_at: expiresAt.toISOString(),
            used: false,
          });
        tokenError = result.error;
      } else {
        tokenError = err;
      }
    }

    if (tokenError) {
      console.error("Error storing access token:", tokenError);
      return NextResponse.json(
        { error: "Failed to generate access token" },
        { status: 500 },
      );
    }

    // Generate signup URL with token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pactwines.com";
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
