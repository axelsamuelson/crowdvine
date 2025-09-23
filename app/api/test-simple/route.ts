import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    console.log("=== SIMPLE TEST API START ===");

    const adminSupabase = getSupabaseAdmin();

    // Simple test query
    const { data, error } = await adminSupabase
      .from("access_tokens")
      .select("count")
      .limit(1);

    console.log("Simple test result:", { data, error });

    return NextResponse.json({
      success: true,
      message: "API is working",
      testResult: { data, error },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Simple test API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
