import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    // Find the invitation code with usage information and email from profiles
    const { data: invitation, error } = await supabase
      .from("invitation_codes")
      .select(`
        id, 
        code, 
        expires_at, 
        max_uses, 
        current_uses, 
        is_active, 
        used_at, 
        used_by,
        profiles!invitation_codes_used_by_fkey(email)
      `)
      .eq("code", code)
      .single();

    if (error || !invitation) {
      return NextResponse.json({
        success: false,
        error: "Invalid invitation code",
      });
    }

    // Always return invitation data, regardless of status
    // This allows the frontend to show the current status
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        code: invitation.code,
        expiresAt: invitation.expires_at,
        maxUses: invitation.max_uses,
        currentUses: invitation.current_uses,
        usedAt: invitation.used_at,
        usedBy: invitation.used_by,
        isActive: invitation.is_active,
        profiles: invitation.profiles,
      },
    });
  } catch (error) {
    console.error("Validate invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
