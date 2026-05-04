import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { UserZoneAddressTemplate } from "@/lib/checkout/user-zone-delivery-template";

/**
 * GET /api/user/zone-addresses
 * Optional `geoZoneId` query: narrow to one template (0 or 1 row).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const geoZoneId = req.nextUrl.searchParams.get("geoZoneId")?.trim() ?? "";
    const sb = getSupabaseAdmin();

    let q = sb
      .from("user_zone_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (geoZoneId) {
      q = q.eq("geo_zone_id", geoZoneId);
    }

    const { data, error } = await q;

    if (error) {
      console.error("[zone-addresses GET]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as UserZoneAddressTemplate[];
    if (geoZoneId) {
      return NextResponse.json({
        geoZoneId,
        address: rows[0] ?? null,
        addresses: rows,
      });
    }

    return NextResponse.json({ addresses: rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
