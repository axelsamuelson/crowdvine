import { getSupabaseAdmin } from "./supabase-admin";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import { findOrCreatePalletForRegion } from "@/lib/pallet-auto-management";
import {
  geocodeAddress,
  createFullAddress,
  isValidCoordinates,
} from "./geocoding";
import {
  CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
  getCountryDisplayName,
  getCountryMarketMode,
  isSupportedCheckoutCountry,
  normalizeProfileCountry,
} from "@/lib/countries";

// Cache for zone matching results to avoid repeated API calls
const zoneCache = new Map<string, ZoneMatchResult>();

// Function to clear zone cache (useful for debugging)
export function clearZoneCache() {
  zoneCache.clear();
  console.log("🧹 Zone cache cleared");
}

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type PalletZoneEmbed = {
  id: string;
  name: string;
  zone_type: string;
};

type ProducerForZonesRow = {
  id: string;
  name?: string | null;
  pickup_zone_id?: string | null;
  shipping_region_id?: string | null;
  pallet_zones?: PalletZoneEmbed | PalletZoneEmbed[] | null;
};

function normalizePalletZoneJoin(
  z: ProducerForZonesRow["pallet_zones"],
): PalletZoneEmbed | null {
  if (z == null) return null;
  if (Array.isArray(z)) return z[0] ?? null;
  return z;
}

/**
 * When every cart producer has the same non-null {@link producers.shipping_region_id},
 * region-based pallets apply and legacy pickup_zone_id is not required.
 */
function unifiedShippingRegionId(
  producers: ProducerForZonesRow[],
): string | null {
  if (producers.length === 0) return null;
  const ids = producers.map((p) => {
    const v = p.shipping_region_id;
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  });
  if (ids.some((id) => id === null)) return null;
  const unique = new Set(ids as string[]);
  if (unique.size !== 1) return null;
  return [...unique][0] ?? null;
}

type SupabaseAdmin = ReturnType<typeof getSupabaseAdmin>;

async function buildPalletInfosForDeliveryPair(
  sb: SupabaseAdmin,
  params: {
    shippingRegionId: string | null;
    pickupZoneId: string | null;
    pickupZoneDisplayName: string | null;
    deliveryZoneId: string;
    deliveryZoneName: string;
  },
): Promise<PalletInfo[]> {
  const {
    shippingRegionId,
    pickupZoneId,
    pickupZoneDisplayName,
    deliveryZoneId,
    deliveryZoneName,
  } = params;
  const pallets: PalletInfo[] = [];

  if (shippingRegionId) {
    try {
      const { palletId } = await findOrCreatePalletForRegion(
        shippingRegionId,
        deliveryZoneId,
      );
      const { data: pRow, error: pe } = await sb
        .from("pallets")
        .select("id, name, bottle_capacity, cost_cents, status")
        .eq("id", palletId)
        .maybeSingle();
      if (pe || !pRow) {
        console.error("[determineZones] region pallet load:", pe?.message);
        return pallets;
      }
      const id = String(pRow.id ?? "");
      if (!id) return pallets;
      const currentBottles = await sumReservedBottlesOnPallet(id);
      const cap = Math.max(0, Math.floor(Number(pRow.bottle_capacity) || 0));
      const statusRaw = pRow.status;
      const status =
        typeof statusRaw === "string" ? statusRaw : null;
      pallets.push({
        id,
        name: String(pRow.name ?? ""),
        currentBottles,
        maxBottles: cap,
        remainingBottles: Math.max(0, cap - currentBottles),
        pickupZoneName: pickupZoneDisplayName || "Shipping region",
        deliveryZoneName,
        costCents: Number(pRow.cost_cents) || 0,
        status,
        shipping_region_id: shippingRegionId,
        delivery_zone_id: deliveryZoneId,
      });
    } catch (e) {
      console.error("[determineZones] region pallet resolve:", e);
    }
    return pallets;
  }

  if (!pickupZoneId) {
    return pallets;
  }

  let { data: matchingPallets, error: palletsError } = await sb
    .from("pallets")
    .select(
      `
      id,
      name,
      bottle_capacity,
      cost_cents,
      pickup_zone_id,
      delivery_zone_id,
      status
    `,
    )
    .eq("pickup_zone_id", pickupZoneId)
    .eq("delivery_zone_id", deliveryZoneId);

  if (
    !palletsError &&
    (!matchingPallets || matchingPallets.length === 0)
  ) {
    console.log(
      "🆕 No pallet exists for this route. Creating new pallet (legacy zone pair)...",
    );

    const newPalletName = `${pickupZoneDisplayName ?? "Pickup"} to ${deliveryZoneName}`;
    const { data: newPallet, error: createError } = await sb
      .from("pallets")
      .insert({
        name: newPalletName,
        pickup_zone_id: pickupZoneId,
        delivery_zone_id: deliveryZoneId,
        bottle_capacity: 720,
        cost_cents: 50000,
        status: "open",
      })
      .select()
      .single();

    if (createError) {
      console.error("❌ Failed to create new pallet:", createError);
    } else if (newPallet) {
      console.log("✅ Created new pallet:", newPallet.id, newPalletName);
      matchingPallets = [newPallet];
    }
  }

  if (!palletsError && matchingPallets) {
    for (const pallet of matchingPallets) {
      const pid = String(pallet.id ?? "");
      if (!pid) continue;
      const currentBottles = await sumReservedBottlesOnPallet(pid);
      const cap = Math.max(0, Math.floor(Number(pallet.bottle_capacity) || 0));
      const st = pallet.status;
      pallets.push({
        id: pid,
        name: String(pallet.name ?? ""),
        currentBottles,
        maxBottles: cap,
        remainingBottles: Math.max(0, cap - currentBottles),
        pickupZoneName: pickupZoneDisplayName || "",
        deliveryZoneName,
        costCents: Number(pallet.cost_cents) || 0,
        status: typeof st === "string" ? st : null,
        delivery_zone_id:
          typeof pallet.delivery_zone_id === "string"
            ? pallet.delivery_zone_id
            : null,
      });
    }
  }

  return pallets;
}

export type NoDeliveryZoneError = {
  error: "NO_DELIVERY_ZONE" | "UNSUPPORTED_COUNTRY";
  message: string;
  address: { city: string; postcode: string; countryCode: string };
};

export interface ZoneMatchResult {
  pickupZoneId: string | null;
  deliveryZoneId: string | null;
  pickupZoneName: string | null;
  deliveryZoneName: string | null;
  availableDeliveryZones?: DeliveryZoneOption[];
  pallets?: PalletInfo[];
  /**
   * When all cart producers share this shipping region, pallets use region routing and
   * {@link pickupZoneId} may be null.
   */
  shippingRegionIdForRouting?: string | null;
  /** Present when the address geocodes but lies outside all delivery zones. */
  noDeliveryZone?: NoDeliveryZoneError;
}

export interface DeliveryZoneOption {
  id: string;
  name: string;
  centerLat: number;
  centerLon: number;
  radiusKm: number;
}

export interface PalletInfo {
  id: string;
  name: string;
  currentBottles: number;
  maxBottles: number;
  remainingBottles: number;
  pickupZoneName: string;
  deliveryZoneName: string;
  costCents: number;
  /** DB pallet lifecycle (e.g. shipping_ordered → direct charge at checkout). */
  status?: string | null;
  /** Present when enriched by checkout zones API (region pallets). */
  shipping_region_id?: string | null;
  /** DB delivery zone id (used when checkout skips EU geocoding, e.g. US conditional). */
  delivery_zone_id?: string | null;
  current_pickup_producer?: { id: string; name: string | null } | null;
  /** Customer-facing market drop when resolved in `/api/checkout/zones`. */
  marketDropId?: string | null;
  /** Same as `id` for internal pallets; included for API clarity. */
  sourcePalletId?: string | null;
}

export interface DeliveryAddress {
  postcode: string;
  city: string;
  countryCode: string;
}

export interface CartItem {
  merchandise: {
    id: string;
  };
  quantity: number;
}

const US_COND_DELIVERY_LABEL = "US (conditional — logistics pending)";

type PalletRowConditional = {
  id: string;
  name?: string | null;
  bottle_capacity?: number | null;
  cost_cents?: number | null;
  status?: string | null;
  delivery_zone_id?: string | null;
  delivery_zone?:
    | { id: string; name?: string | null }
    | Array<{ id: string; name?: string | null }>
    | null;
};

async function palletInfosFromRows(
  sb: SupabaseAdmin,
  rows: PalletRowConditional[],
  pickupLabel: string | null,
  shippingRegionId: string | null,
): Promise<PalletInfo[]> {
  const out: PalletInfo[] = [];
  for (const pallet of rows) {
    const pid = String(pallet.id ?? "");
    if (!pid) continue;
    const dzJoin = pallet.delivery_zone;
    const dzName =
      dzJoin == null
        ? ""
        : Array.isArray(dzJoin)
          ? String(dzJoin[0]?.name ?? "")
          : String((dzJoin as { name?: string | null }).name ?? "");
    const currentBottles = await sumReservedBottlesOnPallet(pid);
    const cap = Math.max(0, Math.floor(Number(pallet.bottle_capacity) || 0));
    const st = pallet.status;
    out.push({
      id: pid,
      name: String(pallet.name ?? ""),
      currentBottles,
      maxBottles: cap,
      remainingBottles: Math.max(0, cap - currentBottles),
      pickupZoneName: pickupLabel || "Shipping region",
      deliveryZoneName: dzName,
      costCents: Number(pallet.cost_cents) || 0,
      status: typeof st === "string" ? st : null,
      shipping_region_id: shippingRegionId,
      delivery_zone_id:
        typeof pallet.delivery_zone_id === "string"
          ? pallet.delivery_zone_id
          : null,
    });
  }
  return out;
}

async function buildConditionalUsZoneResult(
  sb: SupabaseAdmin,
  params: {
    shippingRegionIdForRouting: string | null;
    pickupZoneId: string | null;
    pickupZoneName: string | null;
    deliveryAddress: DeliveryAddress;
  },
): Promise<ZoneMatchResult> {
  const {
    shippingRegionIdForRouting,
    pickupZoneId,
    pickupZoneName,
    deliveryAddress,
  } = params;

  const noPalletMsg =
    "No active pallet was found for this release. Please try again later or contact support.";

  if (shippingRegionIdForRouting) {
    const { data: palletRows, error } = await sb
      .from("pallets")
      .select(
        `
        id,
        name,
        bottle_capacity,
        cost_cents,
        status,
        delivery_zone_id,
        delivery_zone:pallet_zones!delivery_zone_id ( id, name )
      `,
      )
      .eq("shipping_region_id", shippingRegionIdForRouting)
      .in("status", ["open", "consolidating", "shipping_ordered"]);

    if (error) {
      console.error(
        "[determineZones] US conditional pallet query:",
        error.message,
      );
    }

    if (!palletRows?.length) {
      return {
        pickupZoneId: null,
        pickupZoneName,
        deliveryZoneId: null,
        deliveryZoneName: US_COND_DELIVERY_LABEL,
        availableDeliveryZones: [],
        pallets: [],
        shippingRegionIdForRouting,
        noDeliveryZone: {
          error: "NO_DELIVERY_ZONE",
          message: noPalletMsg,
          address: {
            city: deliveryAddress.city,
            postcode: deliveryAddress.postcode,
            countryCode: deliveryAddress.countryCode,
          },
        },
      };
    }

    const pallets = await palletInfosFromRows(
      sb,
      palletRows as PalletRowConditional[],
      pickupZoneName,
      shippingRegionIdForRouting,
    );

    return {
      pickupZoneId: null,
      pickupZoneName,
      deliveryZoneId: null,
      deliveryZoneName: US_COND_DELIVERY_LABEL,
      availableDeliveryZones: [],
      pallets,
      shippingRegionIdForRouting,
    };
  }

  if (pickupZoneId) {
    const { data: palletRows, error } = await sb
      .from("pallets")
      .select(
        `
        id,
        name,
        bottle_capacity,
        cost_cents,
        status,
        delivery_zone_id,
        delivery_zone:pallet_zones!delivery_zone_id ( id, name )
      `,
      )
      .eq("pickup_zone_id", pickupZoneId)
      .in("status", ["open", "consolidating", "shipping_ordered"]);

    if (error) {
      console.error(
        "[determineZones] US conditional legacy pallet query:",
        error.message,
      );
    }

    if (palletRows?.length) {
      const pallets = await palletInfosFromRows(
        sb,
        palletRows as PalletRowConditional[],
        pickupZoneName,
        null,
      );
      return {
        pickupZoneId,
        pickupZoneName,
        deliveryZoneId: null,
        deliveryZoneName: US_COND_DELIVERY_LABEL,
        availableDeliveryZones: [],
        pallets,
        shippingRegionIdForRouting: null,
      };
    }
  }

  return {
    pickupZoneId,
    pickupZoneName,
    deliveryZoneId: null,
    deliveryZoneName: null,
    availableDeliveryZones: [],
    pallets: [],
    shippingRegionIdForRouting,
    noDeliveryZone: {
      error: "NO_DELIVERY_ZONE",
      message: noPalletMsg,
      address: {
        city: deliveryAddress.city,
        postcode: deliveryAddress.postcode,
        countryCode: deliveryAddress.countryCode,
      },
    },
  };
}

export type DetermineZonesOptions = {
  /** From active geo_zones.default_delivery_zone_id — same name as wine zone display. */
  preferredDeliveryZoneId?: string | null;
};

async function loadPreferredDeliveryZone(
  sb: ReturnType<typeof getSupabaseAdmin>,
  preferredId: string | null | undefined,
): Promise<{
  id: string;
  name: string;
  center_lat: number;
  center_lon: number;
  radius_km: number;
} | null> {
  const id = preferredId?.trim();
  if (!id) return null;
  const { data } = await sb
    .from("pallet_zones")
    .select("id, name, center_lat, center_lon, radius_km")
    .eq("id", id)
    .eq("zone_type", "delivery")
    .maybeSingle();
  if (!data?.id) return null;
  return data as {
    id: string;
    name: string;
    center_lat: number;
    center_lon: number;
    radius_km: number;
  };
}

function bumpPreferredDeliveryMatch(
  matchingZones: DeliveryZoneOption[],
  preferredId: string | null | undefined,
): void {
  const pid = preferredId?.trim();
  if (!pid) return;
  const idx = matchingZones.findIndex((z) => z.id === pid);
  if (idx > 0) {
    const [preferred] = matchingZones.splice(idx, 1);
    matchingZones.unshift(preferred);
  }
}

/**
 * Determines pickup and delivery zones based on cart items and delivery address
 */
export async function determineZones(
  cartItems: CartItem[],
  deliveryAddress: DeliveryAddress,
  options?: DetermineZonesOptions,
): Promise<ZoneMatchResult> {
  const preferredDeliveryZoneId =
    options?.preferredDeliveryZoneId?.trim() || null;

  // Create cache key from cart items and delivery address
  const cacheKey = JSON.stringify({
    cartItems: cartItems.map((item) => item.merchandise.id).sort(),
    deliveryAddress: {
      postcode: deliveryAddress.postcode,
      city: deliveryAddress.city,
      countryCode: deliveryAddress.countryCode,
    },
    preferredDeliveryZoneId,
  });

  // Check cache first
  if (zoneCache.has(cacheKey)) {
    console.log(
      "📍 Using cached zone result for:",
      deliveryAddress.city,
      deliveryAddress.countryCode,
    );
    return zoneCache.get(cacheKey)!;
  }

  const sb = getSupabaseAdmin(); // Use admin client to bypass RLS

  // Get unique producer IDs from cart items
  console.log(
    "🍷 Fetching wines for cart items:",
    cartItems.map((item) => item.merchandise.id),
  );
  const { data: wines, error: winesError } = await sb
    .from("wines")
    .select("id, producer_id")
    .in(
      "id",
      cartItems.map((item) => item.merchandise.id),
    );

  console.log("🍷 Wines fetched:", wines);
  if (winesError || !wines) {
    console.error("❌ Failed to fetch wines for zone matching:", winesError);
    return {
      pickupZoneId: null,
      deliveryZoneId: null,
      pickupZoneName: null,
      deliveryZoneName: null,
      shippingRegionIdForRouting: null,
    };
  }

  const producerIds = [
    ...new Set(wines.map((wine) => wine.producer_id).filter(Boolean)),
  ];
  console.log("👨‍🌾 Producer IDs from wines:", producerIds);

  // Get producers with pickup zone join (legacy) and shipping_region_id (region pallets)
  const { data: producers, error: producersError } = await sb
    .from("producers")
    .select(
      `
      id,
      name,
      pickup_zone_id,
      shipping_region_id,
      pallet_zones!pickup_zone_id (
        id,
        name,
        zone_type
      )
    `,
    )
    .in("id", producerIds);

  console.log("👨‍🌾 Producers fetched:", producers);
  if (producersError || !producers) {
    console.error(
      "❌ Failed to fetch producers for zone matching:",
      producersError,
    );
    return {
      pickupZoneId: null,
      deliveryZoneId: null,
      pickupZoneName: null,
      deliveryZoneName: null,
      shippingRegionIdForRouting: null,
    };
  }

  const producerRows = producers as ProducerForZonesRow[];

  const shippingRegionIdForRouting =
    unifiedShippingRegionId(producerRows);

  let pickupZoneId: string | null = null;
  let pickupZoneName: string | null = null;

  if (shippingRegionIdForRouting) {
    const { data: srRow } = await sb
      .from("shipping_regions")
      .select("name")
      .eq("id", shippingRegionIdForRouting)
      .maybeSingle();
    pickupZoneId = null;
    const rn = srRow?.name != null ? String(srRow.name).trim() : "";
    pickupZoneName = rn.length > 0 ? `${rn} (region)` : "Shipping region";
  } else {
    const producerWithPickupZone =
      producerRows.find((p) => normalizePalletZoneJoin(p.pallet_zones)) ??
      null;
    const pickup = normalizePalletZoneJoin(
      producerWithPickupZone?.pallet_zones ?? null,
    );
    pickupZoneId = pickup?.id ?? null;
    pickupZoneName = pickup?.name ?? null;
  }

  console.log("📦 Pickup / routing determined:", {
    pickupZoneId,
    pickupZoneName,
    shippingRegionIdForRouting,
  });

  // For delivery zone, we need to check if the address actually falls within a zone
  let deliveryZoneId: string | null = null;
  let deliveryZoneName: string | null = null;

  // Only set delivery zone if we have a valid delivery address
  if (
    deliveryAddress.countryCode &&
    deliveryAddress.city &&
    deliveryAddress.postcode
  ) {
    const profileCc = normalizeProfileCountry(deliveryAddress.countryCode);

    if (!profileCc || getCountryMarketMode(profileCc) === "unsupported") {
      const unsupported: ZoneMatchResult = {
        pickupZoneId,
        pickupZoneName,
        deliveryZoneId: null,
        deliveryZoneName: null,
        availableDeliveryZones: [],
        pallets: [],
        shippingRegionIdForRouting,
        noDeliveryZone: {
          error: "UNSUPPORTED_COUNTRY",
          message: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
          address: {
            city: deliveryAddress.city,
            postcode: deliveryAddress.postcode,
            countryCode: deliveryAddress.countryCode,
          },
        },
      };
      zoneCache.set(cacheKey, unsupported);
      return unsupported;
    }

    if (getCountryMarketMode(profileCc) === "conditional_reservation") {
      const usResult = await buildConditionalUsZoneResult(sb, {
        shippingRegionIdForRouting,
        pickupZoneId,
        pickupZoneName,
        deliveryAddress,
      });
      zoneCache.set(cacheKey, usResult);
      return usResult;
    }

    const countryCodeNormalized = profileCc;
    if (!isSupportedCheckoutCountry(countryCodeNormalized)) {
      const unsupported: ZoneMatchResult = {
        pickupZoneId,
        pickupZoneName,
        deliveryZoneId: null,
        deliveryZoneName: null,
        availableDeliveryZones: [],
        pallets: [],
        shippingRegionIdForRouting,
        noDeliveryZone: {
          error: "UNSUPPORTED_COUNTRY",
          message: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
          address: {
            city: deliveryAddress.city,
            postcode: deliveryAddress.postcode,
            countryCode: deliveryAddress.countryCode,
          },
        },
      };
      zoneCache.set(cacheKey, unsupported);
      return unsupported;
    }

    // Get all delivery zones for the country (explicit country or legacy global rows)
    console.log(
      "🔍 Fetching delivery zones for country:",
      countryCodeNormalized,
    );
    const { data: deliveryZones, error: deliveryZonesError } = await sb
      .from("pallet_zones")
      .select("id, name, center_lat, center_lon, radius_km, country_code")
      .eq("zone_type", "delivery")
      .or(
        `country_code.eq.${countryCodeNormalized},country_code.is.null`,
      );

    console.log("📍 Found delivery zones:", deliveryZones?.length || 0);
    if (deliveryZones) {
      deliveryZones.forEach((zone) => {
        console.log(
          `  - ${zone.name}: ${zone.center_lat}, ${zone.center_lon} (${zone.radius_km}km radius, country: ${zone.country_code || "null"})`,
        );
      });
    }

    if (!deliveryZonesError && deliveryZones && deliveryZones.length > 0) {
      // Use automatic geocoding to get exact coordinates
      const fullAddress = createFullAddress({
        street: `${deliveryAddress.postcode} ${deliveryAddress.city}`,
        postcode: deliveryAddress.postcode,
        city: deliveryAddress.city,
        country: getCountryDisplayName(countryCodeNormalized, "en"),
      });

      console.log("🌍 Geocoding address:", fullAddress);
      const geocodeResult = await geocodeAddress(fullAddress);

      if ("error" in geocodeResult) {
        console.warn("⚠️ Geocoding failed:", geocodeResult.message);
        // Fallback: don't set delivery zone if geocoding fails
        deliveryZoneId = null;
        deliveryZoneName = null;
      } else {
        const { lat: addressLat, lon: addressLon } = geocodeResult;
        console.log("✅ Geocoding successful:", {
          lat: addressLat,
          lon: addressLon,
        });

        if (!isValidCoordinates(addressLat, addressLon)) {
          console.warn(
            "⚠️ Invalid coordinates from geocoding:",
            addressLat,
            addressLon,
          );
          deliveryZoneId = null;
          deliveryZoneName = null;
        } else {
          console.log("📍 Geocoded address:", {
            address: fullAddress,
            lat: addressLat,
            lon: addressLon,
          });

          // Find all zones that contain this address
          const matchingZones: DeliveryZoneOption[] = [];

          for (const zone of deliveryZones) {
            if (zone.center_lat && zone.center_lon && zone.radius_km) {
              const distance = calculateDistance(
                addressLat,
                addressLon,
                zone.center_lat,
                zone.center_lon,
              );

              console.log(
                `📏 Distance to ${zone.name}: ${distance.toFixed(2)}km (radius: ${zone.radius_km}km)`,
              );

              if (distance <= zone.radius_km) {
                matchingZones.push({
                  id: zone.id,
                  name: zone.name,
                  centerLat: zone.center_lat,
                  centerLon: zone.center_lon,
                  radiusKm: zone.radius_km,
                });
              }
            }
          }

          // If we have matching zones, prioritize by smallest radius (most specific)
          if (matchingZones.length > 0) {
            // Sort by radius (smallest first) to prefer more specific zones
            matchingZones.sort((a, b) => a.radiusKm - b.radiusKm);
            bumpPreferredDeliveryMatch(matchingZones, preferredDeliveryZoneId);

            deliveryZoneId = matchingZones[0].id;
            deliveryZoneName = matchingZones[0].name;

            console.log(
              `✅ Selected zone: ${deliveryZoneName} (${matchingZones[0].radiusKm}km radius)`,
            );
            if (matchingZones.length > 1) {
              console.log(
                `ℹ️  Also within range of: ${matchingZones
                  .slice(1)
                  .map((z) => z.name)
                  .join(", ")}`,
              );
            }

            console.log("✅ Found matching delivery zone:", deliveryZoneName);

            if (
              !shippingRegionIdForRouting &&
              !pickupZoneId &&
              producerRows.length > 0
            ) {
              console.warn(
                'No pickup zone found: cart producers are not all on the same shipping_region_id, and none have pickup_zone_id (or join failed).',
              );
            }

            const pallets =
              deliveryZoneId && deliveryZoneName
                ? await buildPalletInfosForDeliveryPair(sb, {
                    shippingRegionId: shippingRegionIdForRouting,
                    pickupZoneId,
                    pickupZoneDisplayName: pickupZoneName,
                    deliveryZoneId,
                    deliveryZoneName,
                  })
                : [];

            // Cache and return all matching zones for user selection
            const result = {
              pickupZoneId,
              deliveryZoneId,
              pickupZoneName,
              deliveryZoneName,
              availableDeliveryZones: matchingZones,
              pallets,
              shippingRegionIdForRouting,
            };

            // Cache the result
            zoneCache.set(cacheKey, result);
            console.log(
              "💾 Cached zone result for:",
              deliveryAddress.city,
              deliveryAddress.countryCode,
            );

            return result;
          } else {
            console.log("❌ No delivery zones match this address");
            const preferred = await loadPreferredDeliveryZone(
              sb,
              preferredDeliveryZoneId,
            );
            if (preferred) {
              deliveryZoneId = preferred.id;
              deliveryZoneName = preferred.name;
              console.log(
                `✅ Using linked wine-zone delivery zone: ${deliveryZoneName}`,
              );
              const pallets = await buildPalletInfosForDeliveryPair(sb, {
                shippingRegionId: shippingRegionIdForRouting,
                pickupZoneId,
                pickupZoneDisplayName: pickupZoneName,
                deliveryZoneId,
                deliveryZoneName,
              });
              const linkedResult: ZoneMatchResult = {
                pickupZoneId,
                deliveryZoneId,
                pickupZoneName,
                deliveryZoneName,
                availableDeliveryZones: [
                  {
                    id: preferred.id,
                    name: preferred.name,
                    centerLat: preferred.center_lat,
                    centerLon: preferred.center_lon,
                    radiusKm: preferred.radius_km,
                  },
                ],
                pallets,
                shippingRegionIdForRouting,
              };
              zoneCache.set(cacheKey, linkedResult);
              return linkedResult;
            }
            const noDeliveryResult: ZoneMatchResult = {
              pickupZoneId,
              pickupZoneName,
              deliveryZoneId: null,
              deliveryZoneName: null,
              availableDeliveryZones: [],
              pallets: [],
              shippingRegionIdForRouting,
              noDeliveryZone: {
                error: "NO_DELIVERY_ZONE",
                message: "We don't deliver to your area yet.",
                address: {
                  city: deliveryAddress.city,
                  postcode: deliveryAddress.postcode,
                  countryCode: deliveryAddress.countryCode,
                },
              },
            };
            zoneCache.set(cacheKey, noDeliveryResult);
            return noDeliveryResult;
          }
        }
      }
    }
  } else {
    // If no complete address, don't set delivery zone
    deliveryZoneId = null;
    deliveryZoneName = null;
  }

  const pallets: PalletInfo[] =
    deliveryZoneId && deliveryZoneName
      ? await buildPalletInfosForDeliveryPair(sb, {
          shippingRegionId: shippingRegionIdForRouting,
          pickupZoneId,
          pickupZoneDisplayName: pickupZoneName,
          deliveryZoneId,
          deliveryZoneName,
        })
      : [];

  const result = {
    pickupZoneId,
    deliveryZoneId,
    pickupZoneName,
    deliveryZoneName,
    pallets,
    shippingRegionIdForRouting,
  };

  // Cache the result (even if no zones found)
  zoneCache.set(cacheKey, result);
  console.log(
    "💾 Cached zone result (no zones) for:",
    deliveryAddress.city,
    deliveryAddress.countryCode,
  );

  return result;
}
