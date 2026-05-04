import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type GeoEligibilityStatus =
  | "disabled"
  | "browse_only"
  | "interest_only"
  | "conditional_reservation"
  | "normal_checkout";

export type GeoZoneType = "country" | "region" | "city" | "metro" | "custom";

export type ResolvedGeoZone = {
  geoZoneId: string;
  name: string;
  displayName: string;
  zoneType: GeoZoneType;
  eligibilityStatus: GeoEligibilityStatus;
  canBrowse: boolean;
  canStartCampaign: boolean;
  canReserveConditionally: boolean;
  canCheckoutNormally: boolean;
  requiresAdminApproval: boolean;
  isActive: boolean;
  currencyCode: string | null;
  termsVersion: string | null;
  reason?: string;
};

type GeoZoneRow = {
  id: string;
  market_code: string;
  country_code: string;
  region_code: string | null;
  city: string | null;
  name: string;
  display_name: string;
  zone_type: string;
  eligibility_status: string;
  currency_code: string | null;
  terms_version: string | null;
  requires_admin_approval: boolean;
  is_active: boolean;
  sort_order: number;
};

function normCity(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function normRegion(s: string | null | undefined): string {
  const t = (s ?? "").trim().toUpperCase();
  return t.length === 2 ? t : "";
}

function isEligibilityStatus(s: string): s is GeoEligibilityStatus {
  return (
    s === "disabled" ||
    s === "browse_only" ||
    s === "interest_only" ||
    s === "conditional_reservation" ||
    s === "normal_checkout"
  );
}

function isZoneType(s: string): s is GeoZoneType {
  return (
    s === "country" ||
    s === "region" ||
    s === "city" ||
    s === "metro" ||
    s === "custom"
  );
}

function rowToResolved(r: GeoZoneRow): ResolvedGeoZone {
  const st = r.eligibility_status;
  const elig: GeoEligibilityStatus = isEligibilityStatus(st)
    ? st
    : "disabled";

  const canBrowse =
    elig !== "disabled" &&
    (elig === "browse_only" ||
      elig === "interest_only" ||
      elig === "conditional_reservation" ||
      elig === "normal_checkout");

  const canStartCampaign =
    elig === "interest_only" ||
    elig === "conditional_reservation" ||
    elig === "normal_checkout";

  const canReserveConditionally = elig === "conditional_reservation";
  const canCheckoutNormally = elig === "normal_checkout";

  return {
    geoZoneId: r.id,
    name: r.name,
    displayName: r.display_name.trim(),
    zoneType: isZoneType(r.zone_type) ? r.zone_type : "custom",
    eligibilityStatus: elig,
    canBrowse,
    canStartCampaign,
    canReserveConditionally,
    canCheckoutNormally,
    requiresAdminApproval: Boolean(r.requires_admin_approval),
    isActive: Boolean(r.is_active),
    currencyCode:
      typeof r.currency_code === "string" && r.currency_code.trim()
        ? r.currency_code.trim()
        : null,
    termsVersion:
      typeof r.terms_version === "string" && r.terms_version.trim()
        ? r.terms_version.trim()
        : null,
  };
}

/**
 * Most specific active match: city (when profile city present) → region → country.
 * `market_code` and `country_code` must match the resolved commercial market (e.g. EU+SE, US+US).
 */
export async function resolveGeoZone(params: {
  marketCode: string;
  countryCode: string;
  regionCode?: string | null;
  city?: string | null;
}): Promise<ResolvedGeoZone | null> {
  const mc = params.marketCode.trim();
  const cc = params.countryCode.trim().toUpperCase();
  if (!mc || mc === "UNKNOWN" || cc.length !== 2) {
    return null;
  }

  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("geo_zones")
    .select("*")
    .eq("market_code", mc)
    .eq("country_code", cc)
    .eq("is_active", true);

  if (error) {
    console.error("[resolveGeoZone]", error.message);
    return null;
  }

  const list = (rows ?? []) as GeoZoneRow[];
  if (list.length === 0) return null;

  const pc = normCity(params.city);
  const pr = normRegion(params.regionCode);

  const rowCity = (r: GeoZoneRow) => normCity(r.city);
  const rowRegion = (r: GeoZoneRow) => normRegion(r.region_code);

  const cityMatches = list.filter((r) => {
    const rc = rowCity(r);
    if (!pc || !rc || rc !== pc) return false;
    const rr = rowRegion(r);
    if (rr && pr && rr !== pr) return false;
    if (rr && !pr) return false;
    return true;
  });

  const pick = (cands: GeoZoneRow[]): GeoZoneRow | null => {
    if (cands.length === 0) return null;
    const sorted = [...cands].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
    return sorted[0] ?? null;
  };

  const c1 = pick(cityMatches);
  if (c1) return rowToResolved(c1);

  const regionMatches = list.filter((r) => {
    if (rowCity(r)) return false;
    const rr = rowRegion(r);
    if (!rr || !pr || rr !== pr) return false;
    return true;
  });
  const c2 = pick(regionMatches);
  if (c2) return rowToResolved(c2);

  const countryMatches = list.filter((r) => !rowRegion(r) && !rowCity(r));
  const c3 = pick(countryMatches);
  if (c3) return rowToResolved(c3);

  return null;
}

/** Load a single zone by id (e.g. market_drops.geo_zone_id policy check). */
export async function getGeoZoneById(
  id: string,
): Promise<ResolvedGeoZone | null> {
  const tid = id.trim();
  if (!tid) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("geo_zones")
    .select("*")
    .eq("id", tid)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[getGeoZoneById]", error.message);
    return null;
  }
  return rowToResolved(data as GeoZoneRow);
}

/** Map a raw `geo_zones` row (e.g. from admin client) to {@link ResolvedGeoZone}. */
export function mapGeoZoneDbRowToResolved(
  row: Record<string, unknown>,
): ResolvedGeoZone | null {
  if (!row?.id || typeof row.id !== "string") return null;
  return rowToResolved(row as GeoZoneRow);
}
