import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  US_CONDITIONAL_TERMS_VERSION,
  isValidUsStateCode,
} from "@/lib/countries";
import type { ResolvedMarket } from "@/lib/market/resolve-market";
import { resolveGeoZone } from "@/lib/market/resolve-geo-zone";
import {
  resolveMarketDropForPallet,
  resolveMarketDropIdForCheckout,
} from "@/lib/market/resolve-market-drop";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";

const CHECKOUT_AUTO_META = {
  created_by: "checkout_auto_create",
  source: "first_reservation",
} as const;

function isUniqueViolation(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  if (err.code === "23505") return true;
  return Boolean(err.message?.toLowerCase().includes("duplicate"));
}

/**
 * Idempotent: returns existing open slice or inserts one. Server-side checkout only.
 * Requires a matching **active** {@link geo_zones} row with the right eligibility for the flow.
 */
export async function getOrCreateMarketDropForCheckout(params: {
  sourcePalletId: string;
  resolvedMarket: ResolvedMarket;
  usConditionalCheckout: boolean;
  profileCity?: string | null;
}): Promise<string | null> {
  const { sourcePalletId, resolvedMarket, usConditionalCheckout, profileCity } =
    params;

  if (!sourcePalletId?.trim()) return null;
  if (resolvedMarket.marketCode === "UNKNOWN") return null;

  const geo = await resolveGeoZone({
    marketCode: resolvedMarket.marketCode,
    countryCode: resolvedMarket.countryCode,
    regionCode: resolvedMarket.regionCode,
    city: profileCity ?? null,
  });

  if (usConditionalCheckout) {
    if (!resolvedMarket.isConditionalReservationEligible) return null;
    const ru =
      typeof resolvedMarket.regionCode === "string"
        ? resolvedMarket.regionCode.trim().toUpperCase()
        : "";
    if (!isValidUsStateCode(ru)) return null;
    if (!geo?.canReserveConditionally) return null;
  } else {
    if (!resolvedMarket.isCheckoutEligible) return null;
    if (!geo?.canCheckoutNormally) return null;
  }

  const existing = await resolveMarketDropForPallet({
    sourcePalletId,
    marketCode: resolvedMarket.marketCode,
    countryCode: resolvedMarket.countryCode,
    regionCode: resolvedMarket.regionCode,
  });
  if (existing) {
    return existing.id;
  }

  const sb = getSupabaseAdmin();
  const { data: palletRow, error: palletErr } = await sb
    .from("pallets")
    .select("name, bottle_capacity")
    .eq("id", sourcePalletId)
    .maybeSingle();

  if (palletErr) {
    console.error("[getOrCreateMarketDrop] pallet:", palletErr.message);
    return null;
  }

  const palletName =
    typeof (palletRow as { name?: unknown } | null)?.name === "string" &&
    String((palletRow as { name: string }).name).trim()
      ? String((palletRow as { name: string }).name).trim()
      : "Wine release";

  const capRaw = Number((palletRow as { bottle_capacity?: unknown } | null)?.bottle_capacity);
  const capacityBottles =
    Number.isFinite(capRaw) && capRaw > 0 ? Math.round(capRaw) : 720;

  const displayDestination = geo.displayName.trim();
  const cc = resolvedMarket.countryCode.trim().toUpperCase();
  const regionUpper =
    cc === "US" &&
    typeof resolvedMarket.regionCode === "string" &&
    resolvedMarket.regionCode.trim()
      ? resolvedMarket.regionCode.trim().toUpperCase()
      : null;

  let checkout_mode: "conditional_reservation" | "normal_checkout";
  let status: "conditional" | "active";
  let charge_policy: "admin_approved_required" | "automatic_allowed";
  let logistics_status: string;
  let legal_status: string;
  let terms_version: string | null;
  let display_name: string;

  if (usConditionalCheckout) {
    checkout_mode = "conditional_reservation";
    status = "conditional";
    charge_policy = "admin_approved_required";
    logistics_status = "pending";
    legal_status = "review_required";
    terms_version =
      geo.termsVersion?.trim() ||
      resolvedMarket.termsVersion?.trim() ||
      US_CONDITIONAL_TERMS_VERSION;
    const stateLabel =
      displayDestination.split(",")[0]?.trim() ?? regionUpper ?? "US";
    display_name = `${palletName} · ${stateLabel} conditional`;
  } else {
    checkout_mode = "normal_checkout";
    status = "active";
    charge_policy = "automatic_allowed";
    logistics_status = "active";
    legal_status = "approved";
    terms_version =
      geo.termsVersion?.trim() ||
      resolvedMarket.termsVersion?.trim() ||
      null;
    const countryLabel = displayDestination.split(",")[0]?.trim() ?? cc;
    display_name = `${palletName} · ${countryLabel}`;
  }

  const currency = resolveDisplayCurrencyCode({
    zoneCurrencyCode: geo.currencyCode,
    marketCurrencyCode: resolvedMarket.currencyCode,
    countryCode: cc,
    marketCode: resolvedMarket.marketCode,
  });

  const insertRow = {
    source_pallet_id: sourcePalletId,
    geo_zone_id: geo.geoZoneId,
    market_code: resolvedMarket.marketCode,
    country_code: cc,
    region_code: regionUpper,
    display_name,
    display_destination: displayDestination,
    checkout_mode,
    currency_code: currency,
    status,
    charge_policy,
    capacity_bottles: capacityBottles,
    reserved_bottles: 0,
    conditional_bottles: 0,
    terms_version,
    logistics_status,
    legal_status,
    metadata: { ...CHECKOUT_AUTO_META },
  };

  const { data: inserted, error: insErr } = await sb
    .from("market_drops")
    .insert(insertRow)
    .select("id")
    .maybeSingle();

  if (!insErr && inserted && typeof (inserted as { id?: unknown }).id === "string") {
    return String((inserted as { id: string }).id);
  }

  if (isUniqueViolation(insErr ?? null)) {
    const again = await resolveMarketDropForPallet({
      sourcePalletId,
      marketCode: resolvedMarket.marketCode,
      countryCode: resolvedMarket.countryCode,
      regionCode: resolvedMarket.regionCode,
    });
    return again?.id ?? null;
  }

  if (insErr) {
    console.error("[getOrCreateMarketDrop] insert:", insErr.message);
  }
  return null;
}

export async function resolveOrCreateMarketDropIdForCheckout(params: {
  sourcePalletId: string;
  resolvedMarket: ResolvedMarket;
  usConditionalCheckout: boolean;
  profileCity?: string | null;
}): Promise<string | null> {
  const existing = await resolveMarketDropIdForCheckout({
    sourcePalletId: params.sourcePalletId,
    resolvedMarket: params.resolvedMarket,
    usConditionalCheckout: params.usConditionalCheckout,
  });
  if (existing) return existing;
  return getOrCreateMarketDropForCheckout(params);
}
