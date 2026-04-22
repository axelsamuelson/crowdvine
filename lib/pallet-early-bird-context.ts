import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { determineZones, type DeliveryAddress } from "@/lib/zone-matching";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-completion";
import { getPalletDiscountTier, type DiscountTier } from "@/lib/pallet-discount";
import {
  STOCKHOLM_FALLBACK_GEO_ADDRESS,
  resolveDefaultStockholmDeliveryZoneId,
} from "@/lib/pallet-zone-defaults";

function normalizeCountryCode(country: string): string {
  const c = country.trim().toLowerCase();
  if (c === "sweden" || c === "sverige") return "SE";
  if (c.length === 2) return country.trim().toUpperCase();
  return "SE";
}

async function resolveWineIdsByHandles(handles: string[]): Promise<string[]> {
  if (handles.length === 0) return [];
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("wines")
    .select("id")
    .in("handle", handles);

  if (error || !data) return [];
  return [...new Set(data.map((r) => r.id).filter(Boolean))] as string[];
}

/**
 * Delivery address for zone matching: profile when complete, else Stockholm fallback.
 */
export async function resolveDeliveryAddressForUser(
  userId: string | null,
): Promise<DeliveryAddress> {
  if (!userId) {
    return STOCKHOLM_FALLBACK_GEO_ADDRESS;
  }

  const sb = getSupabaseAdmin();
  const { data: prof, error } = await sb
    .from("profiles")
    .select("postal_code, city, country")
    .eq("id", userId)
    .maybeSingle();

  if (
    error ||
    !prof?.postal_code?.trim() ||
    !prof?.city?.trim() ||
    !prof?.country?.trim()
  ) {
    return STOCKHOLM_FALLBACK_GEO_ADDRESS;
  }

  return {
    postcode: String(prof.postal_code).trim(),
    city: String(prof.city).trim(),
    countryCode: normalizeCountryCode(String(prof.country)),
  };
}

export type PalletEarlyBirdContext = {
  bottlesFilled: number;
  discountTier: DiscountTier;
  /** From `pallets.bottle_capacity` when an active pallet exists; otherwise 0. */
  bottleCapacity: number;
  deliveryZoneName: string | null;
  pickupZoneId: string | null;
  deliveryZoneId: string | null;
  activePalletId: string | null;
  activePalletCreatedAt: string | null;
};

/**
 * Shared zone + pallet + fill resolution for cart pricing and zone-status API.
 * Reuses {@link determineZones}; does not reimplement geocoding or zone geometry.
 */
export async function resolvePalletEarlyBirdContext(
  wineIds: string[],
  userId: string | null,
): Promise<PalletEarlyBirdContext> {
  const empty: PalletEarlyBirdContext = {
    bottlesFilled: 0,
    discountTier: 0,
    bottleCapacity: 0,
    deliveryZoneName: null,
    pickupZoneId: null,
    deliveryZoneId: null,
    activePalletId: null,
    activePalletCreatedAt: null,
  };

  const uniqueWineIds = [...new Set(wineIds.filter(Boolean))];
  if (uniqueWineIds.length === 0) {
    return empty;
  }

  const deliveryAddress = await resolveDeliveryAddressForUser(userId);
  const zoneCart = uniqueWineIds.map((id) => ({
    merchandise: { id },
    quantity: 1,
  }));

  let zones = await determineZones(zoneCart, deliveryAddress);

  if (!zones.deliveryZoneId || !zones.pickupZoneId) {
    zones = await determineZones(zoneCart, STOCKHOLM_FALLBACK_GEO_ADDRESS);
  }

  const pickupZoneId = zones.pickupZoneId;
  const deliveryZoneId = zones.deliveryZoneId;

  if (!pickupZoneId || !deliveryZoneId) {
    const stockholmId = await resolveDefaultStockholmDeliveryZoneId();
    const sb = getSupabaseAdmin();
    if (!stockholmId) {
      return {
        ...empty,
        deliveryZoneName: "Stockholm",
      };
    }

    const { data: producers, error: pe } = await sb
      .from("wines")
      .select("producer_id")
      .in("id", uniqueWineIds);

    if (pe || !producers?.length) {
      return { ...empty, deliveryZoneName: "Stockholm" };
    }

    const producerIds = [
      ...new Set(
        producers
          .map((w) => w.producer_id as string | null)
          .filter((x): x is string => Boolean(x)),
      ),
    ];

    const { data: prodRows, error: prErr } = await sb
      .from("producers")
      .select("pickup_zone_id")
      .in("id", producerIds);

    const pickupFromProducer =
      prodRows?.find((p) => p.pickup_zone_id)?.pickup_zone_id ?? null;

    if (!pickupFromProducer) {
      return { ...empty, deliveryZoneName: "Stockholm" };
    }

    const { data: palletRow, error: palErr } = await sb
      .from("pallets")
      .select("id, created_at, bottle_capacity")
      .eq("pickup_zone_id", pickupFromProducer)
      .eq("delivery_zone_id", stockholmId)
      .eq("is_complete", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (palErr || !palletRow?.id) {
      const { data: zoneName } = await sb
        .from("pallet_zones")
        .select("name")
        .eq("id", stockholmId)
        .maybeSingle();
      return {
        ...empty,
        deliveryZoneName: zoneName?.name ?? "Stockholm",
        pickupZoneId: pickupFromProducer,
        deliveryZoneId: stockholmId,
      };
    }

    const bottlesFilled = await sumReservedBottlesOnPallet(palletRow.id);
    const bottleCapacity = Number(palletRow.bottle_capacity) || 0;
    return {
      bottlesFilled,
      discountTier: getPalletDiscountTier(bottlesFilled),
      bottleCapacity,
      deliveryZoneName: "Stockholm",
      pickupZoneId: pickupFromProducer,
      deliveryZoneId: stockholmId,
      activePalletId: palletRow.id,
      activePalletCreatedAt: palletRow.created_at ?? null,
    };
  }

  const sb = getSupabaseAdmin();
  const { data: palletRow, error: palErr } = await sb
    .from("pallets")
    .select("id, created_at, bottle_capacity")
    .eq("pickup_zone_id", pickupZoneId)
    .eq("delivery_zone_id", deliveryZoneId)
    .eq("is_complete", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (palErr || !palletRow?.id) {
    return {
      ...empty,
      deliveryZoneName: zones.deliveryZoneName,
      pickupZoneId,
      deliveryZoneId,
    };
  }

  const bottlesFilled = await sumReservedBottlesOnPallet(palletRow.id);
  const bottleCapacity = Number(palletRow.bottle_capacity) || 0;
  return {
    bottlesFilled,
    discountTier: getPalletDiscountTier(bottlesFilled),
    bottleCapacity,
    deliveryZoneName: zones.deliveryZoneName,
    pickupZoneId,
    deliveryZoneId,
    activePalletId: palletRow.id,
    activePalletCreatedAt: palletRow.created_at ?? null,
  };
}

export async function resolveWineIdForProductHandle(
  productHandle: string,
): Promise<string | null> {
  const trimmed = productHandle.trim();
  if (!trimmed) return null;
  const ids = await resolveWineIdsByHandles([trimmed]);
  return ids[0] ?? null;
}
