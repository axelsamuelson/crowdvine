import { NextRequest, NextResponse } from "next/server";
import {
  geoZoneCityRequired,
  syncDeliveryZoneForGeoZone,
} from "@/lib/market/sync-geo-zone-delivery";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";

function requireAdmin(request: NextRequest) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (!adminAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** GET /api/admin/geo-zones — list zones (optional ?market_code=US). */
export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const sb = getSupabaseAdmin();
    const marketCode = request.nextUrl.searchParams.get("market_code")?.trim();
    let q = sb
      .from("geo_zones")
      .select("*")
      .order("market_code", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (marketCode) {
      q = q.eq("market_code", marketCode);
    }
    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ geoZones: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/admin/geo-zones — create zone. */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const market_code =
      typeof body.market_code === "string" ? body.market_code.trim() : "";
    const country_code =
      typeof body.country_code === "string"
        ? body.country_code.trim().toUpperCase()
        : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const display_name =
      typeof body.display_name === "string" ? body.display_name.trim() : "";
    const zone_type =
      typeof body.zone_type === "string" ? body.zone_type.trim() : "";
    const eligibility_status =
      typeof body.eligibility_status === "string"
        ? body.eligibility_status.trim()
        : "";

    if (
      !market_code ||
      country_code.length !== 2 ||
      !name ||
      !display_name ||
      !zone_type ||
      !eligibility_status
    ) {
      return NextResponse.json(
        {
          error:
            "market_code, country_code (ISO-2), name, display_name, zone_type, eligibility_status are required",
        },
        { status: 400 },
      );
    }

    const region_code =
      typeof body.region_code === "string" && body.region_code.trim()
        ? body.region_code.trim().toUpperCase()
        : null;
    const city =
      typeof body.city === "string" && body.city.trim()
        ? body.city.trim()
        : null;
    const cityErr = geoZoneCityRequired(city);
    if (cityErr) {
      return NextResponse.json({ error: cityErr }, { status: 400 });
    }
    let currency_code =
      typeof body.currency_code === "string" && body.currency_code.trim()
        ? body.currency_code.trim().toUpperCase()
        : null;
    if (!currency_code) {
      currency_code = resolveDisplayCurrencyCode({
        marketCode: market_code,
        countryCode: country_code,
      });
    }
    const terms_version =
      typeof body.terms_version === "string" && body.terms_version.trim()
        ? body.terms_version.trim()
        : null;
    const requires_admin_approval =
      typeof body.requires_admin_approval === "boolean"
        ? body.requires_admin_approval
        : true;
    const is_active =
      typeof body.is_active === "boolean" ? body.is_active : true;
    const sort_order =
      typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
        ? Math.round(body.sort_order)
        : 0;
    const metadata =
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : {};

    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("geo_zones")
      .insert({
        market_code,
        country_code,
        region_code,
        city,
        name,
        display_name,
        zone_type,
        eligibility_status,
        currency_code,
        terms_version,
        requires_admin_approval,
        is_active,
        sort_order,
        metadata,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Insert failed" },
        { status: 500 },
      );
    }
    const id = (data as { id: string }).id;
    if (is_active && eligibility_status !== "disabled") {
      try {
        await syncDeliveryZoneForGeoZone({
          geoZoneId: id,
          displayName: display_name,
          countryCode: country_code,
          city: city!,
        });
      } catch (syncErr) {
        const msg =
          syncErr instanceof Error ? syncErr.message : "Delivery zone sync failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
    return NextResponse.json({ id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
