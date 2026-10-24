import type { SupabaseClient } from "@supabase/supabase-js";
import {
  budbeeLightSwedenRateCard,
  calculateOutboundFreightQuoteBreakdown,
  type OutboundFreightQuoteBreakdown,
} from "@/lib/outbound-freight-pricing";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";

/** Same query as GET /api/admin/geo-zones. */
export async function listGeoZones(
  sb: SupabaseClient,
  options?: { market_code?: string },
) {
  let q = sb
    .from("geo_zones")
    .select(
      `
      *,
      delivery_zone:pallet_zones!geo_zones_default_delivery_zone_id_fkey(
        id, name, radius_km, center_lat, center_lon, zone_type
      )
    `,
    )
    .order("market_code", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (options?.market_code) {
    q = q.eq("market_code", options.market_code);
  }
  const { data, error } = await q;
  if (error) {
    // Fallback without embed (same as admin list page)
    let q2 = sb
      .from("geo_zones")
      .select("*")
      .order("market_code", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (options?.market_code) {
      q2 = q2.eq("market_code", options.market_code);
    }
    const fallback = await q2;
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data ?? [];
  }
  return data ?? [];
}

export async function getGeoZone(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("geo_zones")
    .select(
      `
      *,
      delivery_zone:pallet_zones!geo_zones_default_delivery_zone_id_fkey(
        id, name, radius_km, center_lat, center_lon, zone_type
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const fallback = await sb
      .from("geo_zones")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fallback.error) throw new Error(fallback.error.message);
    return fallback.data;
  }
  return data;
}

/** Same as GET /api/admin/shipping-regions (+ producer_count). */
export async function listShippingRegions(sb: SupabaseClient) {
  const { data: regions, error: regErr } = await sb
    .from("shipping_regions")
    .select("id, name, country_code, description, created_at, updated_at")
    .order("name");
  if (regErr) throw new Error(regErr.message);

  const { data: producers, error: prodErr } = await sb
    .from("producers")
    .select("shipping_region_id")
    .not("shipping_region_id", "is", null);
  if (prodErr) throw new Error(prodErr.message);

  const countByRegion = new Map<string, number>();
  for (const row of producers ?? []) {
    const rid = row.shipping_region_id as string | null;
    if (!rid) continue;
    countByRegion.set(rid, (countByRegion.get(rid) ?? 0) + 1);
  }

  return (regions ?? []).map((r) => ({
    ...r,
    producer_count: countByRegion.get(r.id) ?? 0,
  }));
}

export async function getShippingRegion(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("shipping_regions")
    .select("id, name, country_code, description, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { count, error: countErr } = await sb
    .from("producers")
    .select("id", { count: "exact", head: true })
    .eq("shipping_region_id", id);
  if (countErr) throw new Error(countErr.message);

  return { ...data, producer_count: count ?? 0 };
}

/** Admin list of customer shipping REVENUE rates (affects checkout). */
export async function listCustomerShippingRates(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("customer_shipping_rates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Same as GET /api/admin/freight/catalogue. */
export async function listFreightCatalogue(sb: SupabaseClient) {
  const { data: providers, error: pErr } = await sb
    .from("logistics_providers")
    .select("*")
    .order("name");
  if (pErr) throw new Error(pErr.message);

  const { data: services, error: sErr } = await sb
    .from("freight_services")
    .select("*")
    .order("name");
  if (sErr) throw new Error(sErr.message);

  const { data: rates, error: rErr } = await sb
    .from("freight_rates")
    .select("*")
    .order("created_at", { ascending: false });
  if (rErr) throw new Error(rErr.message);

  const rateIds = (rates ?? []).map((r) => r.id as string);
  let components: Record<string, unknown>[] = [];
  if (rateIds.length > 0) {
    const { data: comps, error: cErr } = await sb
      .from("freight_rate_components")
      .select("*")
      .in("freight_rate_id", rateIds)
      .order("sort_order");
    if (cErr) throw new Error(cErr.message);
    components = (comps ?? []) as Record<string, unknown>[];
  }

  const { data: packaging, error: pkgErr } = await sb
    .from("packaging_profiles")
    .select("*")
    .order("code");
  if (pkgErr) throw new Error(pkgErr.message);

  return {
    providers: providers ?? [],
    services: services ?? [],
    rates: rates ?? [],
    components,
    packaging: packaging ?? [],
  };
}

export type PreviewOutboundFreightInput = {
  destination_country?: string;
  bottle_count?: number;
  max_bottles?: number;
  length_m?: number | null;
  width_m?: number | null;
  height_m?: number | null;
  as_of_date?: string;
  base_price_cents?: number;
  surcharges?: unknown[];
};

/** Same calculator as POST /api/admin/freight/outbound (no persist). */
export function previewOutboundFreight(
  body: PreviewOutboundFreightInput,
): OutboundFreightQuoteBreakdown {
  const rate = budbeeLightSwedenRateCard();
  if (body.base_price_cents != null) {
    rate.basePriceCents = Math.round(Number(body.base_price_cents));
  }
  return calculateOutboundFreightQuoteBreakdown({
    rate,
    destinationCountry: String(body.destination_country || "SE"),
    bottleCount: Number(body.bottle_count) || 0,
    maxBottlesPerParcel:
      body.max_bottles != null ? Number(body.max_bottles) : 6,
    lengthM: body.length_m != null ? Number(body.length_m) : null,
    widthM: body.width_m != null ? Number(body.width_m) : null,
    heightM: body.height_m != null ? Number(body.height_m) : null,
    asOfDate: body.as_of_date || undefined,
    surcharges: Array.isArray(body.surcharges) ? body.surcharges : [],
  });
}

/** Pickup zones with pallet stats (same as GET /api/admin/zones?type=pickup). */
export async function listPickupZonesWithStats(sb: SupabaseClient) {
  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("zone_type", "pickup")
    .order("name");
  if (error) throw new Error(error.message);

  const { data: allPallets } = await sb
    .from("pallets")
    .select("id, name, bottle_capacity, pickup_zone_id, delivery_zone_id");

  return (data || []).map((zone) => {
    const pickupPallets =
      allPallets?.filter((p) => p.pickup_zone_id === zone.id) || [];
    const deliveryPallets =
      allPallets?.filter((p) => p.delivery_zone_id === zone.id) || [];
    const totalPallets = pickupPallets.length + deliveryPallets.length;
    const totalCapacity = [...pickupPallets, ...deliveryPallets].reduce(
      (sum, p) => sum + (p.bottle_capacity || 0),
      0,
    );
    return {
      ...zone,
      totalPallets,
      totalCapacity,
      pickupPallets: pickupPallets.length,
      deliveryPallets: deliveryPallets.length,
    };
  });
}

export async function getPickupZone(sb: SupabaseClient, id: string) {
  const { data, error } = await sb
    .from("pallet_zones")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (data.zone_type !== "pickup") {
    throw new Error("Zone is not a pickup zone (delivery zones live under geo-zones)");
  }
  return data;
}

/** Same select as GET /api/admin/pallets/[id]/freight-quotes. */
export async function listPalletFreightQuotes(
  sb: SupabaseClient,
  palletId: string,
) {
  const { data: quotes, error } = await sb
    .from("pallet_freight_quotes")
    .select(
      `
      *,
      provider:logistics_providers(id, name, code),
      service:freight_services(id, name, transport_mode, pricing_type, route_description),
      rate:freight_rates(id, base_price_amount, currency, max_weight_kg, pallet_type, pricing_type)
    `,
    )
    .eq("pallet_id", palletId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return quotes ?? [];
}

/**
 * Reservations for a PACT pallet without customer PII.
 * Returns id, status, total_bottles (count), and non-PII item summary.
 */
export async function listPalletReservationsMcpSafe(
  sb: SupabaseClient,
  palletId: string,
) {
  const { data: pallet, error: palletError } = await sb
    .from("pallets")
    .select("id")
    .eq("id", palletId)
    .maybeSingle();
  if (palletError) throw new Error(palletError.message);
  if (!pallet) return null;

  const { data: reservations, error: reservationsError } = await sb
    .from("order_reservations")
    .select("id, status, created_at")
    .in("status", [...PALLET_FILL_STATUSES])
    .eq("pallet_id", palletId)
    .order("created_at", { ascending: false });
  if (reservationsError) throw new Error(reservationsError.message);
  if (!reservations?.length) return [];

  const reservationIds = reservations.map((r) => r.id);
  const { data: items, error: itemsError } = await sb
    .from("order_reservation_items")
    .select(
      `
      reservation_id,
      quantity,
      wines(wine_name, producers(name))
    `,
    )
    .in("reservation_id", reservationIds);
  if (itemsError) throw new Error(itemsError.message);

  type ItemRow = {
    reservation_id: string;
    quantity: number | null;
    wines?: {
      wine_name?: string | null;
      producers?: { name?: string | null } | null;
    } | null;
  };

  const itemsByReservationId = new Map<string, ItemRow[]>();
  for (const it of (items ?? []) as ItemRow[]) {
    const arr = itemsByReservationId.get(it.reservation_id) || [];
    arr.push(it);
    itemsByReservationId.set(it.reservation_id, arr);
  }

  return reservations.map((reservation) => {
    const resItems = itemsByReservationId.get(reservation.id) || [];
    const itemSummary = resItems.map((item) => ({
      wine_name: item.wines?.wine_name || "Unknown Wine",
      producer_name: item.wines?.producers?.name || "Unknown Producer",
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    }));
    const total_bottles = itemSummary.reduce((sum, i) => sum + i.quantity, 0);
    return {
      id: reservation.id,
      status: reservation.status,
      total_bottles,
      created_at: reservation.created_at,
      items: itemSummary,
    };
  });
}
