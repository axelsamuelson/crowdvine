import type { SupabaseClient } from "@supabase/supabase-js";

export type GeoZoneGateResult =
  | { ok: true }
  | { ok: false; message: string; status: number };

/**
 * Validates a geo_zones row for invite signup / active-zone persistence:
 * exists, active, not disabled.
 */
export async function validateEligibleGeoZoneId(
  sb: SupabaseClient,
  geoZoneId: string,
): Promise<GeoZoneGateResult> {
  const id = geoZoneId.trim();
  if (!id) {
    return { ok: false, message: "Wine zone is required", status: 400 };
  }

  const { data: gz, error } = await sb
    .from("geo_zones")
    .select("id, is_active, eligibility_status, city")
    .eq("id", id)
    .maybeSingle();

  if (error || !gz) {
    return { ok: false, message: "Invalid wine zone", status: 400 };
  }

  const row = gz as {
    is_active?: boolean;
    eligibility_status?: string | null;
    city?: string | null;
  };
  const city = (row.city ?? "").trim();
  if (!city) {
    return {
      ok: false,
      message: "Wine zone must include a city",
      status: 400,
    };
  }
  if (!row.is_active) {
    return { ok: false, message: "Wine zone is not active", status: 400 };
  }

  const elig = String(row.eligibility_status ?? "").toLowerCase();
  if (elig === "disabled") {
    return { ok: false, message: "Wine zone is not available", status: 400 };
  }

  return { ok: true };
}
