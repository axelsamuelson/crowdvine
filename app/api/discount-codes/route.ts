import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch discount codes for this user
    const { data: discountCodes, error } = await supabase
      .from("discount_codes")
      .select("*")
      .or(`earned_by_user_id.eq.${user.id},used_by_user_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching discount codes:", error);
      return NextResponse.json(
        { error: "Failed to fetch discount codes" },
        { status: 500 },
      );
    }

    return NextResponse.json(discountCodes || []);
  } catch (error) {
    console.error("Discount codes API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
