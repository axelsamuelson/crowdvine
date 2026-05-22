import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveActiveGeoZoneForUser } from "@/lib/market/resolve-active-geo-zone";

/**
 * GET /api/user/active-zone — resolved active shopping geo (preference → profile → default).
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const active = await resolveActiveGeoZoneForUser(user.id);
    return NextResponse.json({ activeZone: active });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * PATCH /api/user/active-zone — body `{ activeGeoZoneId: string }`.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const raw = body.activeGeoZoneId ?? body.active_geo_zone_id;
    const activeGeoZoneId =
      typeof raw === "string" && raw.trim() ? raw.trim() : null;
    if (!activeGeoZoneId) {
      return NextResponse.json(
        { error: "activeGeoZoneId is required" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const { data: gz, error: gzErr } = await sb
      .from("geo_zones")
      .select("*")
      .eq("id", activeGeoZoneId)
      .maybeSingle();

    if (gzErr || !gz) {
      return NextResponse.json(
        { error: gzErr?.message ?? "Geo zone not found" },
        { status: 404 },
      );
    }

    const row = gz as Record<string, unknown>;
    if (!row.is_active) {
      return NextResponse.json(
        { error: "Geo zone is not active" },
        { status: 400 },
      );
    }
    const elig = String(row.eligibility_status ?? "").toLowerCase();
    if (elig === "disabled") {
      return NextResponse.json(
        { error: "Geo zone is disabled" },
        { status: 400 },
      );
    }
    const city = String(row.city ?? "").trim();
    if (!city) {
      return NextResponse.json(
        { error: "Wine zone must include a city" },
        { status: 400 },
      );
    }

    const { error: upsertErr } = await sb.from("user_zone_preferences").upsert(
      {
        user_id: user.id,
        active_geo_zone_id: activeGeoZoneId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      console.error("[active-zone PATCH]", upsertErr.message);
      return NextResponse.json(
        { error: upsertErr.message },
        { status: 500 },
      );
    }

    const active = await resolveActiveGeoZoneForUser(user.id);
    return NextResponse.json({ ok: true, activeZone: active });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
