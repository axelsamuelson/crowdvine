import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { MembershipLevel } from "@/lib/membership/points-engine";

/**
 * POST /api/admin/invitations/generate
 * 
 * Generate invitation with custom initial level (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getSupabaseAdmin();

    // Check if user is admin
    const { data: profile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      expiresInDays = 30, 
      initialLevel = 'basic',
      maxUses = 1,
      email = null,
    } = body;

    // Validate initial level
    const validLevels: MembershipLevel[] = ['basic', 'brons', 'silver', 'guld'];
    if (!validLevels.includes(initialLevel as MembershipLevel)) {
      return NextResponse.json(
        { error: "Invalid initial level. Must be: basic, brons, silver, or guld" },
        { status: 400 }
      );
    }

    // Generate invitation code
    const code = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation with initial_level
    const { data, error } = await sb
      .from("invitation_codes")
      .insert({
        code,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        is_active: true,
        initial_level: initialLevel,
        email,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating admin invitation:", error);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 },
      );
    }

    // Generate signup URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
        initialLevel: data.initial_level,
      },
    });
  } catch (error) {
    console.error("Generate admin invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function generateInvitationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

