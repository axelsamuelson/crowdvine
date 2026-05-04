import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validateEligibleGeoZoneId } from "@/lib/market/validate-eligible-geo-zone";
import { isValidUsStateCode } from "@/lib/countries";

type PatchBody = {
  full_name?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  postal_code?: string;
  country_code?: string;
  region_code?: string | null;
};

function upper2(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
}

/**
 * PATCH /api/user/zone-addresses/[geoZoneId]
 * Upsert delivery template for current user + geo zone. Does not touch profiles.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ geoZoneId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { geoZoneId: rawId } = await params;
    const geoZoneId = String(rawId ?? "").trim();
    if (!geoZoneId) {
      return NextResponse.json({ error: "geoZoneId is required" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const gate = await validateEligibleGeoZoneId(sb, geoZoneId);
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.message },
        { status: gate.status },
      );
    }

    const { data: gz, error: gzErr } = await sb
      .from("geo_zones")
      .select("id, country_code, region_code")
      .eq("id", geoZoneId)
      .maybeSingle();

    if (gzErr || !gz) {
      return NextResponse.json({ error: "Geo zone not found" }, { status: 404 });
    }

    const gzRow = gz as {
      country_code?: string;
      region_code?: string | null;
    };
    const zoneCc = String(gzRow.country_code ?? "")
      .trim()
      .toUpperCase();
    const zoneRc =
      gzRow.region_code == null || String(gzRow.region_code).trim() === ""
        ? null
        : String(gzRow.region_code).trim().toUpperCase();

    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const cc = upper2(body.country_code);
    if (cc.length !== 2) {
      return NextResponse.json(
        { error: "country_code must be a 2-letter ISO code" },
        { status: 400 },
      );
    }
    if (cc !== zoneCc) {
      return NextResponse.json(
        {
          error: `country_code must match this wine zone (${zoneCc})`,
        },
        { status: 400 },
      );
    }

    let rc: string | null =
      body.region_code == null || String(body.region_code).trim() === ""
        ? null
        : upper2(String(body.region_code));

    if (zoneRc) {
      if (rc !== zoneRc) {
        return NextResponse.json(
          {
            error: `region_code must match this wine zone (${zoneRc})`,
          },
          { status: 400 },
        );
      }
    }

    if (cc === "US" && rc && !isValidUsStateCode(rc)) {
      return NextResponse.json(
        { error: "Invalid US state or territory code" },
        { status: 400 },
      );
    }

    const address_line1 = String(body.address_line1 ?? "").trim();
    const city = String(body.city ?? "").trim();
    const postal_code = String(body.postal_code ?? "").trim();
    if (!address_line1 || !city || !postal_code) {
      return NextResponse.json(
        { error: "address_line1, city, and postal_code are required" },
        { status: 400 },
      );
    }

    const payload = {
      user_id: user.id,
      geo_zone_id: geoZoneId,
      full_name: body.full_name?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address_line1,
      address_line2: body.address_line2?.trim() || null,
      city,
      postal_code,
      country_code: cc,
      region_code: rc,
      is_default_for_zone: true,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error: upErr } = await sb
      .from("user_zone_addresses")
      .upsert(payload, { onConflict: "user_id,geo_zone_id" })
      .select("*")
      .maybeSingle();

    if (upErr) {
      console.error("[zone-addresses PATCH]", upErr.message);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, address: upserted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
