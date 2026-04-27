import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { determineZones, type DeliveryAddress } from "@/lib/zone-matching";
import { getPalletFillData } from "@/lib/pallet-fill-count";
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
type PalletRow = {
  id: string;
  created_at: string | null;
  bottle_capacity: number | string | null;
};

async function findOpenPalletByShippingRegion(
  shippingRegionId: string,
  deliveryZoneId: string,
): Promise<PalletRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("pallets")
    .select("id, created_at, bottle_capacity")
    .eq("shipping_region_id", shippingRegionId)
    .eq("delivery_zone_id", deliveryZoneId)
    .in("status", ["open", "consolidating", "shipping_ordered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  return {
    id: data.id,
    created_at: data.created_at ?? null,
    bottle_capacity: data.bottle_capacity,
  };
}

async function findLegacyOpenPalletByPickup(
  pickupZoneId: string,
  deliveryZoneId: string,
): Promise<PalletRow | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("pallets")
    .select("id, created_at, bottle_capacity")
    .eq("pickup_zone_id", pickupZoneId)
    .eq("delivery_zone_id", deliveryZoneId)
    .in("status", ["open", "consolidating", "shipping_ordered"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  return {
    id: data.id,
    created_at: data.created_at ?? null,
    bottle_capacity: data.bottle_capacity,
  };
}

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

  const sb = getSupabaseAdmin();

  const { data: wineRows, error: wineErr } = await sb
    .from("wines")
    .select("id, producer_id")
    .in("id", uniqueWineIds);

  const producerIds = [
    ...new Set(
      (wineRows ?? [])
        .map((w) => w.producer_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  let shippingRegionId: string | null = null;
  let pickupFromAnyProducer: string | null = null;

  if (!wineErr && wineRows && producerIds.length > 0) {
    const { data: prodRows, error: prodErr } = await sb
      .from("producers")
      .select("id, shipping_region_id, pickup_zone_id")
      .in("id", producerIds);

    if (!prodErr && prodRows) {
      const byProducerId = new Map(
        prodRows.map((p) => [
          String(p.id),
          {
            shipping_region_id:
              (p.shipping_region_id as string | null) ?? null,
            pickup_zone_id: (p.pickup_zone_id as string | null) ?? null,
          },
        ]),
      );

      for (const pr of prodRows) {
        const pk = pr.pickup_zone_id as string | null | undefined;
        if (pk && !pickupFromAnyProducer) {
          pickupFromAnyProducer = pk;
        }
      }

      for (const wid of uniqueWineIds) {
        const row = wineRows.find((w) => w.id === wid);
        const pid = row?.producer_id ? String(row.producer_id) : null;
        if (!pid) continue;
        const pr = byProducerId.get(pid);
        if (pr?.shipping_region_id) {
          shippingRegionId = pr.shipping_region_id;
          break;
        }
      }
    }
  }

  const returnFromPallet = async (
    palletRow: PalletRow,
    ctx: {
      deliveryZoneName: string | null;
      pickupZoneId: string | null;
      deliveryZoneId: string | null;
    },
  ): Promise<PalletEarlyBirdContext> => {
    const fill = await getPalletFillData(
      palletRow.id,
      Number(palletRow.bottle_capacity) || 0,
    );
    const { bottlesFilled, bottleCapacity } = fill;
    return {
      bottlesFilled,
      discountTier: getPalletDiscountTier(bottlesFilled),
      bottleCapacity,
      deliveryZoneName: ctx.deliveryZoneName,
      pickupZoneId: ctx.pickupZoneId,
      deliveryZoneId: ctx.deliveryZoneId,
      activePalletId: palletRow.id,
      activePalletCreatedAt: palletRow.created_at ?? null,
    };
  };

  if (deliveryZoneId) {
    let palletRow: PalletRow | null = null;
    if (shippingRegionId) {
      palletRow = await findOpenPalletByShippingRegion(
        shippingRegionId,
        deliveryZoneId,
      );
    }
    if (!palletRow && pickupZoneId) {
      palletRow = await findLegacyOpenPalletByPickup(
        pickupZoneId,
        deliveryZoneId,
      );
    }

    if (!palletRow) {
      return {
        ...empty,
        deliveryZoneName: zones.deliveryZoneName,
        pickupZoneId,
        deliveryZoneId,
      };
    }

    return returnFromPallet(palletRow, {
      deliveryZoneName: zones.deliveryZoneName,
      pickupZoneId,
      deliveryZoneId,
    });
  }

  const stockholmId = await resolveDefaultStockholmDeliveryZoneId();
  if (!stockholmId) {
    return {
      ...empty,
      deliveryZoneName: "Stockholm",
    };
  }

  if (producerIds.length === 0) {
    return { ...empty, deliveryZoneName: "Stockholm" };
  }

  let palletRow: PalletRow | null = null;
  if (shippingRegionId) {
    palletRow = await findOpenPalletByShippingRegion(
      shippingRegionId,
      stockholmId,
    );
  }

  if (!palletRow && pickupFromAnyProducer) {
    palletRow = await findLegacyOpenPalletByPickup(
      pickupFromAnyProducer,
      stockholmId,
    );
  }

  if (!palletRow) {
    const { data: zoneName } = await sb
      .from("pallet_zones")
      .select("name")
      .eq("id", stockholmId)
      .maybeSingle();
    return {
      ...empty,
      deliveryZoneName: zoneName?.name ?? "Stockholm",
      pickupZoneId: pickupFromAnyProducer,
      deliveryZoneId: stockholmId,
    };
  }

  return returnFromPallet(palletRow, {
    deliveryZoneName: "Stockholm",
    pickupZoneId: pickupFromAnyProducer,
    deliveryZoneId: stockholmId,
  });
}

export async function resolveWineIdForProductHandle(
  productHandle: string,
): Promise<string | null> {
  const trimmed = productHandle.trim();
  if (!trimmed) return null;
  const ids = await resolveWineIdsByHandles([trimmed]);
  return ids[0] ?? null;
}
