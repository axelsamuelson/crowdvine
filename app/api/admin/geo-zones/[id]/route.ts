import { NextRequest, NextResponse } from "next/server";
import { deleteGeoZone } from "@/lib/actions/geo-zones";
import {
  geoZoneCityRequired,
  syncDeliveryZoneForGeoZone,
} from "@/lib/market/sync-geo-zone-delivery";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function requireAdmin(request: NextRequest) {
  const adminAuth = request.cookies.get("admin-auth")?.value;
  if (!adminAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/** PATCH /api/admin/geo-zones/[id] — partial update. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const str = (k: string) =>
      typeof body[k] === "string" ? (body[k] as string).trim() : undefined;
    const opt = (k: string) => {
      const v = str(k);
      if (v !== undefined) patch[k] = v || null;
    };

    opt("name");
    opt("display_name");
    if (typeof body.zone_type === "string") patch.zone_type = body.zone_type.trim();
    if (typeof body.eligibility_status === "string") {
      patch.eligibility_status = body.eligibility_status.trim();
    }
    if (typeof body.country_code === "string") {
      patch.country_code = body.country_code.trim().toUpperCase();
    }
    if (body.region_code === null) patch.region_code = null;
    else if (typeof body.region_code === "string") {
      patch.region_code = body.region_code.trim().toUpperCase() || null;
    }
    if (body.city === null) patch.city = null;
    else if (typeof body.city === "string") {
      patch.city = body.city.trim() || null;
    }
    if (typeof body.currency_code === "string") {
      patch.currency_code = body.currency_code.trim().toUpperCase() || null;
    }
    if (body.terms_version === null) patch.terms_version = null;
    else if (typeof body.terms_version === "string") {
      patch.terms_version = body.terms_version.trim() || null;
    }
    if (typeof body.requires_admin_approval === "boolean") {
      patch.requires_admin_approval = body.requires_admin_approval;
    }
    if (typeof body.is_active === "boolean") {
      patch.is_active = body.is_active;
    }
    if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
      patch.sort_order = Math.round(body.sort_order);
    }
    if (body.metadata && typeof body.metadata === "object") {
      patch.metadata = body.metadata;
    }

    const sb = getSupabaseAdmin();
    const { data: before } = await sb
      .from("geo_zones")
      .select(
        "id, display_name, country_code, city, is_active, eligibility_status, default_delivery_zone_id",
      )
      .eq("id", id)
      .maybeSingle();

    if (!before) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const mergedCity =
      patch.city !== undefined
        ? (patch.city as string | null)
        : (before as { city?: string | null }).city;
    const cityErr = geoZoneCityRequired(
      typeof mergedCity === "string" ? mergedCity : null,
    );
    if (cityErr) {
      return NextResponse.json({ error: cityErr }, { status: 400 });
    }

    const { data, error } = await sb
      .from("geo_zones")
      .update(patch)
      .eq("id", id)
      .select(
        "id, display_name, country_code, city, is_active, eligibility_status, default_delivery_zone_id",
      )
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = data as {
      id: string;
      display_name: string;
      country_code: string;
      city: string | null;
      is_active: boolean;
      eligibility_status: string;
      default_delivery_zone_id: string | null;
    };

    if (row.is_active && row.eligibility_status !== "disabled") {
      try {
        await syncDeliveryZoneForGeoZone({
          geoZoneId: row.id,
          displayName: row.display_name,
          countryCode: row.country_code,
          city: row.city!.trim(),
          existingDeliveryZoneId: row.default_delivery_zone_id,
        });
      } catch (syncErr) {
        const msg =
          syncErr instanceof Error ? syncErr.message : "Delivery zone sync failed";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, id: row.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/admin/geo-zones/[id] — remove geo zone (+ linked delivery when possible). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const result = await deleteGeoZone(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.includes("hittades inte") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
