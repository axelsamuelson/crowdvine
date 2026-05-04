import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { MarketDropRow } from "@/lib/market/market-drop-types";
import type { ResolvedMarket } from "@/lib/market/resolve-market";

const DROP_STATUSES_LIVE = ["active", "conditional", "paused"] as const;

function isLiveStatus(s: string): boolean {
  return (DROP_STATUSES_LIVE as readonly string[]).includes(s);
}

function rowToMarketDrop(row: Record<string, unknown>): MarketDropRow {
  return {
    id: String(row.id),
    source_pallet_id: String(row.source_pallet_id),
    geo_zone_id:
      row.geo_zone_id == null || row.geo_zone_id === ""
        ? null
        : String(row.geo_zone_id),
    market_code: String(row.market_code),
    country_code: String(row.country_code),
    region_code:
      row.region_code == null ? null : String(row.region_code).toUpperCase(),
    display_name: String(row.display_name),
    display_destination: String(row.display_destination),
    checkout_mode: row.checkout_mode as MarketDropRow["checkout_mode"],
    currency_code: String(row.currency_code),
    status: row.status as MarketDropRow["status"],
    charge_policy: row.charge_policy as MarketDropRow["charge_policy"],
    capacity_bottles:
      row.capacity_bottles == null ? null : Number(row.capacity_bottles),
    reserved_bottles: Number(row.reserved_bottles) || 0,
    conditional_bottles: Number(row.conditional_bottles) || 0,
    terms_version:
      row.terms_version == null ? null : String(row.terms_version),
    logistics_status:
      row.logistics_status == null ? null : String(row.logistics_status),
    legal_status:
      row.legal_status == null ? null : String(row.legal_status),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Find a customer-facing market_drop for an internal pallet and resolved geography.
 *
 * - Prefers exact `region_code` when `regionCode` is set (e.g. US + CA).
 * - If `regionCode` is null/empty, matches rows where `region_code` IS NULL (e.g. EU + SE).
 * - Does not fall back across regions (no CA drop for NY).
 *
 * TODO Phase 3: optional market_drop-aware fill aggregation instead of source pallet only.
 */
export async function resolveMarketDropForPallet(params: {
  sourcePalletId: string;
  marketCode: string;
  countryCode: string;
  regionCode?: string | null;
}): Promise<MarketDropRow | null> {
  const mc = params.marketCode.trim();
  if (!mc || mc === "UNKNOWN") {
    return null;
  }

  const cc = params.countryCode.trim().toUpperCase();
  if (cc.length !== 2) return null;

  const regionUpper =
    typeof params.regionCode === "string" && params.regionCode.trim()
      ? params.regionCode.trim().toUpperCase()
      : null;

  const sb = getSupabaseAdmin();

  if (regionUpper) {
    const { data, error } = await sb
      .from("market_drops")
      .select("*")
      .eq("source_pallet_id", params.sourcePalletId)
      .eq("market_code", mc)
      .eq("country_code", cc)
      .eq("region_code", regionUpper)
      .in("status", [...DROP_STATUSES_LIVE])
      .maybeSingle();

    if (error) {
      console.error("[resolveMarketDrop] exact region query:", error.message);
      return null;
    }
    if (data && isLiveStatus(String((data as { status?: string }).status))) {
      return rowToMarketDrop(data as Record<string, unknown>);
    }
    return null;
  }

  const { data, error } = await sb
    .from("market_drops")
    .select("*")
    .eq("source_pallet_id", params.sourcePalletId)
    .eq("market_code", mc)
    .eq("country_code", cc)
    .is("region_code", null)
    .in("status", [...DROP_STATUSES_LIVE])
    .maybeSingle();

  if (error) {
    console.error("[resolveMarketDrop] null-region query:", error.message);
    return null;
  }
  if (data && isLiveStatus(String((data as { status?: string }).status))) {
    return rowToMarketDrop(data as Record<string, unknown>);
  }
  return null;
}

export function isCustomerConditionalDrop(drop: MarketDropRow): boolean {
  return (
    drop.checkout_mode === "conditional_reservation" ||
    drop.status === "conditional"
  );
}

export async function getMarketDropById(
  id: string,
): Promise<MarketDropRow | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("market_drops")
    .select("*")
    .eq("id", trimmed)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("[getMarketDropById]", error.message);
    }
    return null;
  }
  return rowToMarketDrop(data as Record<string, unknown>);
}

/**
 * Resolves the market_drop row to persist on `order_reservations.market_drop_id`.
 * Server-derived only; callers should reject client-supplied ids that do not match.
 */
export async function resolveMarketDropIdForCheckout(params: {
  sourcePalletId: string;
  resolvedMarket: ResolvedMarket;
  usConditionalCheckout: boolean;
}): Promise<string | null> {
  const { sourcePalletId, resolvedMarket, usConditionalCheckout } = params;
  if (!sourcePalletId || resolvedMarket.marketCode === "UNKNOWN") {
    return null;
  }

  const drop = await resolveMarketDropForPallet({
    sourcePalletId,
    marketCode: resolvedMarket.marketCode,
    countryCode: resolvedMarket.countryCode,
    regionCode: resolvedMarket.regionCode,
  });

  if (!drop || drop.source_pallet_id !== sourcePalletId) {
    return null;
  }

  if (!isLiveStatus(drop.status)) {
    return null;
  }

  if (usConditionalCheckout) {
    if (!resolvedMarket.isConditionalReservationEligible) {
      return null;
    }
    if (!isCustomerConditionalDrop(drop)) {
      return null;
    }
    return drop.id;
  }

  if (
    resolvedMarket.isCheckoutEligible &&
    drop.checkout_mode === "normal_checkout"
  ) {
    return drop.id;
  }

  return null;
}

/**
 * Validates a client-provided UUID matches the server-resolved drop for this checkout.
 */
export function assertClientMarketDropIdAllowed(params: {
  clientMarketDropId: string | null;
  serverMarketDropId: string | null;
}): { ok: true } | { ok: false; message: string } {
  const c = params.clientMarketDropId?.trim() || null;
  if (!c) {
    return { ok: true };
  }
  if (!params.serverMarketDropId || c !== params.serverMarketDropId) {
    return {
      ok: false,
      message: "market_drop_id does not match your profile and pallet.",
    };
  }
  return { ok: true };
}
