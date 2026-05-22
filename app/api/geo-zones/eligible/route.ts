import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/geo-zones/eligible — active city-level wine zones shoppers may pick.
 */
export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("geo_zones")
      .select(
        "id, display_name, market_code, country_code, region_code, city, zone_type, eligibility_status, currency_code, sort_order, default_delivery_zone_id",
      )
      .eq("is_active", true)
      .neq("eligibility_status", "disabled")
      .not("city", "is", null)
      .order("market_code", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const geoZones = (data ?? []).filter(
      (z) => typeof (z as { city?: string }).city === "string" && (z as { city: string }).city.trim().length > 0,
    );
    return NextResponse.json({ geoZones });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
