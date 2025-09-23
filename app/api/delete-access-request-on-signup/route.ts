import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Delete access request after successful signup
    const { error } = await supabase
      .from("access_requests")
      .delete()
      .eq("email", email.toLowerCase().trim());

    if (error) {
      console.error("Error deleting access request:", error);
      return NextResponse.json(
        { error: "Failed to delete access request" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Access request deleted successfully",
    });
  } catch (error) {
    console.error("Delete access request API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
