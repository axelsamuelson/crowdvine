import { supabaseServer } from "./supabase-server";
import { getSupabaseAdmin } from "./supabase-admin";
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

export interface ZoneMatchResult {
  pickupZoneId: string | null;
  deliveryZoneId: string | null;
  pickupZoneName: string | null;
  deliveryZoneName: string | null;
  availableDeliveryZones?: DeliveryZoneOption[];
  pallets?: PalletInfo[];
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
    cartItems: cartItems.map(item => item.merchandise.id).sort(),
    deliveryAddress: {
      postcode: deliveryAddress.postcode,
      city: deliveryAddress.city,
      countryCode: deliveryAddress.countryCode,
    }
  });

  // Check cache first
  if (zoneCache.has(cacheKey)) {
    console.log("📍 Using cached zone result for:", deliveryAddress.city, deliveryAddress.countryCode);
    return zoneCache.get(cacheKey)!;
  }

  const sb = getSupabaseAdmin(); // Use admin client to bypass RLS

  // Get unique producer IDs from cart items
  const { data: wines, error: winesError } = await sb
    .from("wines")
    .select("id, producer_id")
    .in(
      "id",
      cartItems.map((item) => item.merchandise.id),
    );

  if (winesError || !wines) {
    console.error("Failed to fetch wines for zone matching:", winesError);
    return {
      pickupZoneId: null,
      deliveryZoneId: null,
      pickupZoneName: null,
      deliveryZoneName: null,
    };
  }

  const producerIds = [...new Set(wines.map((wine) => wine.producer_id))];

  // Get producers with their pickup zones
  const { data: producers, error: producersError } = await sb
    .from("producers")
    .select(
      `
      id,
      name,
      pickup_zone_id,
      pallet_zones!pickup_zone_id (
        id,
        name,
        zone_type
      )
    `,
    )
    .in("id", producerIds);

  if (producersError || !producers) {
    console.error(
      "Failed to fetch producers for zone matching:",
      producersError,
    );
    return {
      pickupZoneId: null,
      deliveryZoneId: null,
      pickupZoneName: null,
      deliveryZoneName: null,
    };
  }

  // Determine pickup zone (use the first producer's pickup zone)
  const pickupZone = producers[0]?.pallet_zones;
  const pickupZoneId = pickupZone?.id || null;
  const pickupZoneName = pickupZone?.name || null;

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
            
            console.log(`✅ Selected zone: ${deliveryZoneName} (${matchingZones[0].radiusKm}km radius)`);
            if (matchingZones.length > 1) {
              console.log(`ℹ️  Also within range of: ${matchingZones.slice(1).map(z => z.name).join(', ')}`);
            }

            console.log("✅ Found matching delivery zone:", deliveryZoneName);

            // Get pallets that match the zones
            const pallets: PalletInfo[] = [];
            if (pickupZoneId && deliveryZoneId) {
              const { data: matchingPallets, error: palletsError } = await sb
                .from("pallets")
                .select(
                  `
                  id,
                  name,
                  bottle_capacity,
                  cost_cents,
                  pickup_zone_id,
                  delivery_zone_id
                `,
                )
                .eq("pickup_zone_id", pickupZoneId)
                .eq("delivery_zone_id", deliveryZoneId);

              if (!palletsError && matchingPallets) {
                // Get current bottle count for each pallet
                for (const pallet of matchingPallets) {
                  // Get current bottle count for each pallet using pallet_id
                  const { data: bookings, error: bookingsError } = await sb
                    .from("bookings")
                    .select("quantity")
                    .eq("pallet_id", pallet.id);

                  const currentBottles = bookingsError
                    ? 0
                    : bookings?.reduce(
                        (sum, booking) => sum + booking.quantity,
                        0,
                      ) || 0;

                  pallets.push({
                    id: pallet.id,
                    name: pallet.name,
                    currentBottles,
                    maxBottles: pallet.bottle_capacity,
                    remainingBottles: pallet.bottle_capacity - currentBottles,
                    pickupZoneName: pickupZoneName || "",
                    deliveryZoneName: deliveryZoneName || "",
                    costCents: pallet.cost_cents,
                  });
                }
              }
            }

            // Cache and return all matching zones for user selection
            const result = {
              pickupZoneId,
              deliveryZoneId,
              pickupZoneName,
              deliveryZoneName,
              availableDeliveryZones: matchingZones,
              pallets,
            };
            
            // Cache the result
            zoneCache.set(cacheKey, result);
            console.log("💾 Cached zone result for:", deliveryAddress.city, deliveryAddress.countryCode);
            
            return result;
          } else {
            console.log("❌ No delivery zones match this address");
            deliveryZoneId = null;
            deliveryZoneName = null;
          }
        }
      }
    }
  } else {
    // If no complete address, don't set delivery zone
    deliveryZoneId = null;
    deliveryZoneName = null;
  }

  // Get pallets that match the zones
  const pallets: PalletInfo[] = [];
  if (pickupZoneId && deliveryZoneId) {
    const { data: matchingPallets, error: palletsError } = await sb
      .from("pallets")
      .select(
        `
        id,
        name,
        bottle_capacity,
        cost_cents,
        pickup_zone_id,
        delivery_zone_id
      `,
      )
      .eq("pickup_zone_id", pickupZoneId)
      .eq("delivery_zone_id", deliveryZoneId);

    if (!palletsError && matchingPallets) {
      // Get current bottle count for each pallet
      for (const pallet of matchingPallets) {
        // Get current bottle count for each pallet using pallet_id
        const { data: bookings, error: bookingsError } = await sb
          .from("bookings")
          .select("quantity")
          .eq("pallet_id", pallet.id);

        const currentBottles = bookingsError
          ? 0
          : bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;

        pallets.push({
          id: pallet.id,
          name: pallet.name,
          currentBottles,
          maxBottles: pallet.bottle_capacity,
          remainingBottles: pallet.bottle_capacity - currentBottles,
          pickupZoneName: pickupZoneName || "",
          deliveryZoneName: deliveryZoneName || "",
          costCents: pallet.cost_cents,
        });
      }
    }
  }

  const result = {
    pickupZoneId,
    deliveryZoneId,
    pickupZoneName,
    deliveryZoneName,
    pallets,
  };
  
  // Cache the result (even if no zones found)
  zoneCache.set(cacheKey, result);
  console.log("💾 Cached zone result (no zones) for:", deliveryAddress.city, deliveryAddress.countryCode);
  
  return result;
}
