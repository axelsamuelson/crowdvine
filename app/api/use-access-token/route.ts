import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const adminSupabase = getSupabaseAdmin();

    // Mark token as used
    const { error } = await adminSupabase
      .from("access_tokens")
      .update({
        used: true,
        used_at: new Date().toISOString(),
      })
      .eq("token", token);

    if (error) {
      console.error("Error marking token as used:", error);
      return NextResponse.json(
        { error: "Failed to mark token as used" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token marked as used",
    });
  } catch (error) {
    console.error("Use access token API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
