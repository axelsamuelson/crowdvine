import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/countries
 * Returns predefined countries (code, name) for selects.
 */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("countries")
      .select("code, name")
      .order("name");

    if (error) {
      console.error("Countries fetch error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ countries: data ?? [] });
  } catch (err) {
    console.error("Countries API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 },
    );
  }
}
