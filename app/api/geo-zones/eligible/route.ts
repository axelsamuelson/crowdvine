import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/geo-zones/eligible — active geo zones shoppers may pick (read-only, public).
 */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("geo_zones")
      .select(
        "id, display_name, market_code, country_code, region_code, city, zone_type, eligibility_status, currency_code, sort_order",
      )
      .eq("is_active", true)
      .neq("eligibility_status", "disabled")
      .order("market_code", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ geoZones: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
