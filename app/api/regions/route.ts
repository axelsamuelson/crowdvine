import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/regions
 * Returns predefined regions (value, label, country_code).
 * Query: ?country_code=FR to filter by country.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("country_code");

    const sb = getSupabaseAdmin();
    let query = sb.from("regions").select("value, label, country_code").order("label");

    if (countryCode) {
      query = query.or(`country_code.eq.${countryCode},country_code.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Regions fetch error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ regions: data ?? [] });
  } catch (err) {
    console.error("Regions API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 },
    );
  }
}
