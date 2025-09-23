import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { expiresInDays = 30 } = await request.json();

    // Create Supabase client for user authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value),
            );
          },
        },
      },
    );

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get user profile to verify access
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, access_granted_at")
      .eq("id", user.id)
      .not("access_granted_at", "is", null)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User not found or no access granted" },
        { status: 403 },
      );
    }

    // Generate invitation code
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const { data, error } = await supabase
      .from("invitation_codes")
      .insert({
        code,
        created_by: profile.id,
        expires_at: expiresAt.toISOString(),
        max_uses: 1,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating invitation:", error);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 },
      );
    }

    // Generate signup URLs with shorter, more robust structure
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Create shorter URLs that are less likely to be broken by Instagram
    // Use shorter path structure: /i/{code} instead of /invite-signup?invite={code}
    const signupUrl = `${baseUrl}/i/${code}`;
    const codeSignupUrl = `${baseUrl}/c/${code}`;

    return NextResponse.json({
      success: true,
      invitation: {
        id: data.id,
        code,
        signupUrl,
        codeSignupUrl,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
      },
    });
  } catch (error) {
    console.error("Generate invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  // Shorter code (12 characters) to make URLs more compact
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
