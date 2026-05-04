import { getCountryCodeFromProfileCountry } from "@/lib/countries";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  mapGeoZoneDbRowToResolved,
  resolveGeoZone,
} from "@/lib/market/resolve-geo-zone";
import { resolveMarketForCountry } from "@/lib/market/resolve-market";

export type ActiveGeoZoneSource = "preference" | "profile" | "default";

export type ResolvedActiveGeoZone = {
  geoZoneId: string | null;
  marketCode: string;
  countryCode: string;
  regionCode: string | null;
  city: string | null;
  displayName: string;
  zoneType: string;
  eligibilityStatus: string;
  currencyCode: string;
  source: ActiveGeoZoneSource;
  canStartCampaign: boolean;
  canReserveConditionally: boolean;
  canCheckoutNormally: boolean;
};

function normCity(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function dbRowToActive(
  row: Record<string, unknown>,
  source: ActiveGeoZoneSource,
): ResolvedActiveGeoZone {
  const resolved = mapGeoZoneDbRowToResolved(row);
  if (!resolved) {
    throw new Error("[resolveActiveGeoZone] invalid geo row");
  }
  const mc = String(row.market_code ?? "").trim();
  const cc = String(row.country_code ?? "").trim().toUpperCase();
  const rc =
    row.region_code == null || String(row.region_code).trim() === ""
      ? null
      : String(row.region_code).trim().toUpperCase();
  const city =
    row.city == null || String(row.city).trim() === ""
      ? null
      : String(row.city).trim();

  return {
    geoZoneId: String(row.id),
    marketCode: mc,
    countryCode: cc.length === 2 ? cc : "SE",
    regionCode: rc,
    city,
    displayName: resolved.displayName,
    zoneType: resolved.zoneType,
    eligibilityStatus: resolved.eligibilityStatus,
    currencyCode: resolved.currencyCode?.trim() || "SEK",
    source,
    canStartCampaign: resolved.canStartCampaign,
    canReserveConditionally: resolved.canReserveConditionally,
    canCheckoutNormally: resolved.canCheckoutNormally,
  };
}

/**
 * Default PDP / anonymous context: Stockholm city geo if seeded, else Sweden country geo.
 */
export async function resolveDefaultGeoZone(): Promise<ResolvedActiveGeoZone> {
  const sb = getSupabaseAdmin();

  const { data: cityRows } = await sb
    .from("geo_zones")
    .select("*")
    .eq("market_code", "EU")
    .eq("country_code", "SE")
    .eq("zone_type", "city")
    .eq("is_active", true);

  const cityHit = (cityRows ?? []).find(
    (r) => normCity((r as { city?: string }).city) === "stockholm",
  );
  if (cityHit && typeof (cityHit as { id?: unknown }).id === "string") {
    return dbRowToActive(cityHit as Record<string, unknown>, "default");
  }

  const { data: countryRows } = await sb
    .from("geo_zones")
    .select("*")
    .eq("market_code", "EU")
    .eq("country_code", "SE")
    .eq("zone_type", "country")
    .eq("is_active", true)
    .limit(1);

  const c0 = countryRows?.[0];
  if (c0 && typeof (c0 as { id?: unknown }).id === "string") {
    return dbRowToActive(c0 as Record<string, unknown>, "default");
  }

  return {
    geoZoneId: null,
    marketCode: "EU",
    countryCode: "SE",
    regionCode: null,
    city: null,
    displayName: "Stockholm, Sweden",
    zoneType: "city",
    eligibilityStatus: "normal_checkout",
    currencyCode: "SEK",
    source: "default",
    canStartCampaign: true,
    canReserveConditionally: false,
    canCheckoutNormally: true,
  };
}

/**
 * Active shopping geo for a logged-in user.
 * A) user_zone_preferences.active_geo_zone_id when row is active and not disabled
 * B) resolveGeoZone from profile country/region/city
 * C) default Stockholm / Sweden geo
 */
export async function resolveActiveGeoZoneForUser(
  userId: string,
): Promise<ResolvedActiveGeoZone> {
  const sb = getSupabaseAdmin();

  const { data: pref } = await sb
    .from("user_zone_preferences")
    .select("active_geo_zone_id")
    .eq("user_id", userId)
    .maybeSingle();

  const prefRaw = (pref as { active_geo_zone_id?: unknown } | null)
    ?.active_geo_zone_id;
  const prefId =
    prefRaw != null && String(prefRaw).trim() !== ""
      ? String(prefRaw).trim()
      : null;

  if (prefId) {
    const { data: gz } = await sb
      .from("geo_zones")
      .select("*")
      .eq("id", prefId)
      .maybeSingle();

    if (gz != null) {
      const row = gz as Record<string, unknown>;
      const idStr = row.id != null ? String(row.id).trim() : "";
      if (idStr) {
        const isActive = Boolean(row.is_active);
        const elig = String(row.eligibility_status ?? "").toLowerCase();
        if (isActive && elig !== "disabled") {
          return dbRowToActive(row, "preference");
        }
      }
    }
  }

  const { data: prof, error: profErr } = await sb
    .from("profiles")
    .select("country, region, city")
    .eq("id", userId)
    .maybeSingle();

  if (profErr) {
    console.error("[resolveActiveGeoZoneForUser] profile:", profErr.message);
    return resolveDefaultGeoZone();
  }

  const cc = getCountryCodeFromProfileCountry(
    typeof prof?.country === "string" ? prof.country : "",
  );
  if (!cc) {
    return resolveDefaultGeoZone();
  }

  const regionRaw =
    typeof prof?.region === "string" && prof.region.trim()
      ? prof.region.trim()
      : null;
  const cityRaw =
    typeof prof?.city === "string" && prof.city.trim()
      ? prof.city.trim()
      : null;

  const resolvedMarket = await resolveMarketForCountry({
    countryCode: cc,
    regionCode: regionRaw,
  });

  if (resolvedMarket.marketCode === "UNKNOWN") {
    return resolveDefaultGeoZone();
  }

  const geo = await resolveGeoZone({
    marketCode: resolvedMarket.marketCode,
    countryCode: resolvedMarket.countryCode,
    regionCode: resolvedMarket.regionCode,
    city: cityRaw,
  });

  if (geo) {
    const { data: row } = await sb
      .from("geo_zones")
      .select("*")
      .eq("id", geo.geoZoneId)
      .maybeSingle();
    if (row != null) {
      const r = row as Record<string, unknown>;
      const idStr = r.id != null ? String(r.id).trim() : "";
      if (idStr) {
        return dbRowToActive(r, "profile");
      }
    }

    return {
      geoZoneId: geo.geoZoneId,
      marketCode: resolvedMarket.marketCode,
      countryCode: resolvedMarket.countryCode,
      regionCode: resolvedMarket.regionCode ?? null,
      city: cityRaw,
      displayName: geo.displayName,
      zoneType: geo.zoneType,
      eligibilityStatus: geo.eligibilityStatus,
      currencyCode: geo.currencyCode?.trim() || resolvedMarket.currencyCode || "SEK",
      source: "profile",
      canStartCampaign: geo.canStartCampaign,
      canReserveConditionally: geo.canReserveConditionally,
      canCheckoutNormally: geo.canCheckoutNormally,
    };
  }

  return resolveDefaultGeoZone();
}

/** Anonymous PDP: always default Stockholm/Sweden geo slice. */
export async function resolveActiveGeoZoneAnonymous(): Promise<ResolvedActiveGeoZone> {
  return resolveDefaultGeoZone();
}
