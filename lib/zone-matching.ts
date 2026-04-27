import { getSupabaseAdmin } from "./supabase-admin";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import { findOrCreatePalletForRegion } from "@/lib/pallet-auto-management";
import {
  geocodeAddress,
  createFullAddress,
  isValidCoordinates,
} from "./geocoding";

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
      });
    }
  }

  return pallets;
}

export type NoDeliveryZoneError = {
  error: "NO_DELIVERY_ZONE";
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
  current_pickup_producer?: { id: string; name: string | null } | null;
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

/**
 * Determines pickup and delivery zones based on cart items and delivery address
 */
export async function determineZones(
  cartItems: CartItem[],
  deliveryAddress: DeliveryAddress,
): Promise<ZoneMatchResult> {
  // Create cache key from cart items and delivery address
  const cacheKey = JSON.stringify({
    cartItems: cartItems.map((item) => item.merchandise.id).sort(),
    deliveryAddress: {
      postcode: deliveryAddress.postcode,
      city: deliveryAddress.city,
      countryCode: deliveryAddress.countryCode,
    },
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
    // Get all delivery zones for the country
    console.log(
      "🔍 Fetching delivery zones for country:",
      deliveryAddress.countryCode,
    );
    const { data: deliveryZones, error: deliveryZonesError } = await sb
      .from("pallet_zones")
      .select("id, name, center_lat, center_lon, radius_km, country_code")
      .eq("zone_type", "delivery")
      .or(
        `country_code.eq.${deliveryAddress.countryCode},country_code.is.null`,
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
        country: deliveryAddress.countryCode === "SE" ? "Sweden" : undefined,
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
