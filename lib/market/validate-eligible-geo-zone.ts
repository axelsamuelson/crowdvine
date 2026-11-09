import type { SupabaseClient } from "@supabase/supabase-js";

export type GeoZoneGateResult =
  | { ok: true; countryLevel: boolean }
  | {
      ok: false;
      /** Stable machine code for callers / logs — never show raw to customers. */
      code: string;
      /** Legacy English message for logs / admin; checkout must map via i18n. */
      message: string;
      status: number;
    };

/**
 * Validates a geo_zones row for invite signup / active-zone persistence:
 * exists, active, not disabled.
 *
 * Country-level zones (empty city) are allowed — the customer's address city
 * is validated separately on delivery save. A missing country_code is treated
 * as a configuration error (logged by callers).
 */
export async function validateEligibleGeoZoneId(
  sb: SupabaseClient,
  geoZoneId: string,
): Promise<GeoZoneGateResult> {
  const id = geoZoneId.trim();
  if (!id) {
    return {
      ok: false,
      code: "geo_zone_required",
      message: "Wine zone is required",
      status: 400,
    };
  }

  const { data: gz, error } = await sb
    .from("geo_zones")
    .select("id, is_active, eligibility_status, city, country_code")
    .eq("id", id)
    .maybeSingle();

  if (error || !gz) {
    return {
      ok: false,
      code: "geo_zone_invalid",
      message: "Invalid wine zone",
      status: 400,
    };
  }

  const row = gz as {
    is_active?: boolean;
    eligibility_status?: string | null;
    city?: string | null;
    country_code?: string | null;
  };
  const city = (row.city ?? "").trim();
  const countryCode = (row.country_code ?? "").trim().toUpperCase();
  const countryLevel = city.length === 0;

  if (!countryCode || countryCode.length !== 2) {
    console.error(
      "[validateEligibleGeoZoneId] misconfigured geo_zone missing country_code",
      { geoZoneId: id },
    );
    return {
      ok: false,
      code: "geo_zone_misconfigured",
      message: "Wine zone is misconfigured",
      status: 400,
    };
  }

  if (!row.is_active) {
    return {
      ok: false,
      code: "geo_zone_inactive",
      message: "Wine zone is not active",
      status: 400,
    };
  }

  const elig = String(row.eligibility_status ?? "").toLowerCase();
  if (elig === "disabled") {
    return {
      ok: false,
      code: "geo_zone_disabled",
      message: "Wine zone is not available",
      status: 400,
    };
  }

  return { ok: true, countryLevel };
}
