import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Test if discount_codes table exists by trying to select from it
    const { data, error } = await supabase
      .from("discount_codes")
      .select("id")
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Discount codes table exists",
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Test discount codes table error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
