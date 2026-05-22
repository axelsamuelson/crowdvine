import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";

function pickStr(o: Record<string, unknown>, camel: string, snake: string): string {
  const v = o[camel] ?? o[snake];
  if (v == null) return "";
  return String(v).trim();
}

function pickBool(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
  fallback = false,
): boolean {
  const v = o[camel] ?? o[snake];
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return fallback;
}

/**
 * Normalizes GET/PATCH /api/user/active-zone JSON into {@link ResolvedActiveGeoZone}.
 * Accepts camelCase or snake_case keys so client state never drifts from the server payload shape.
 */
export function parseResolvedActiveZoneFromApi(
  body: unknown,
): ResolvedActiveGeoZone | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const raw =
    root.activeZone ?? root.active_zone ?? root.data ?? root.result;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const geoZoneIdRaw = pickStr(o, "geoZoneId", "geo_zone_id");
  const geoZoneId = geoZoneIdRaw || null;

  return {
    geoZoneId,
    marketCode: pickStr(o, "marketCode", "market_code") || "EU",
    countryCode: pickStr(o, "countryCode", "country_code") || "SE",
    regionCode: (() => {
      const rc = pickStr(o, "regionCode", "region_code");
      return rc || null;
    })(),
    city: (() => {
      const c = pickStr(o, "city", "city");
      return c || null;
    })(),
    displayName: pickStr(o, "displayName", "display_name") || "",
    zoneType: pickStr(o, "zoneType", "zone_type") || "city",
    eligibilityStatus:
      pickStr(o, "eligibilityStatus", "eligibility_status") ||
      "normal_checkout",
    currencyCode: pickStr(o, "currencyCode", "currency_code") || "SEK",
    defaultDeliveryZoneId: (() => {
      const d = pickStr(o, "defaultDeliveryZoneId", "default_delivery_zone_id");
      return d || null;
    })(),
    source: ((): ResolvedActiveGeoZone["source"] => {
      const s = pickStr(o, "source", "source");
      if (s === "preference" || s === "profile" || s === "default") return s;
      return "default";
    })(),
    canStartCampaign: pickBool(o, "canStartCampaign", "can_start_campaign", true),
    canReserveConditionally: pickBool(
      o,
      "canReserveConditionally",
      "can_reserve_conditionally",
      false,
    ),
    canCheckoutNormally: pickBool(
      o,
      "canCheckoutNormally",
      "can_checkout_normally",
      true,
    ),
  };
}
