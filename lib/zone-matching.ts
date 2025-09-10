import { supabaseServer } from "./supabase-server";

// Simple city to coordinates mapping (in a real app, use a geocoding service)
function getLatitudeForCity(city: string, countryCode: string): number | null {
  const cityLower = city.toLowerCase();
  
  if (countryCode === "SE") {
    switch (cityLower) {
      case "stockholm": return 59.3293;
      case "karlstad": return 59.3793;
      case "gothenburg": return 57.7089;
      case "malmö": return 55.6050;
      case "uppsala": return 59.8586;
      case "västerås": return 59.6162;
      case "örebro": return 59.2741;
      case "linköping": return 58.4108;
      case "helsingborg": return 56.0465;
      case "jönköping": return 57.7826;
      default: return null;
    }
  }
  
  return null;
}

function getLongitudeForCity(city: string, countryCode: string): number | null {
  const cityLower = city.toLowerCase();
  
  if (countryCode === "SE") {
    switch (cityLower) {
      case "stockholm": return 18.0686;
      case "karlstad": return 13.5036;
      case "gothenburg": return 11.9746;
      case "malmö": return 13.0038;
      case "uppsala": return 17.6389;
      case "västerås": return 16.5528;
      case "örebro": return 15.2066;
      case "linköping": return 15.6214;
      case "helsingborg": return 12.6945;
      case "jönköping": return 14.1618;
      default: return null;
    }
  }
  
  return null;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  const sb = await supabaseServer();

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
    const { data: deliveryZones, error: deliveryZonesError } = await sb
      .from("pallet_zones")
      .select("id, name, center_lat, center_lon, radius_km, country_code")
      .eq("zone_type", "delivery")
      .or(`country_code.eq.${deliveryAddress.countryCode},country_code.is.null`);

    if (!deliveryZonesError && deliveryZones && deliveryZones.length > 0) {
      // For now, we'll use a simple geocoding approach
      // In a real implementation, you'd want to use a proper geocoding service
      const addressLat = getLatitudeForCity(deliveryAddress.city, deliveryAddress.countryCode);
      const addressLon = getLongitudeForCity(deliveryAddress.city, deliveryAddress.countryCode);
      
      if (addressLat && addressLon) {
        // Find all zones that contain this address
        const matchingZones: DeliveryZoneOption[] = [];
        
        for (const zone of deliveryZones) {
          if (zone.center_lat && zone.center_lon && zone.radius_km) {
            const distance = calculateDistance(
              addressLat, addressLon,
              zone.center_lat, zone.center_lon
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
        
        // If we have matching zones, use the first one as default
        if (matchingZones.length > 0) {
          deliveryZoneId = matchingZones[0].id;
          deliveryZoneName = matchingZones[0].name;
          
          // Return all matching zones for user selection
          return {
            pickupZoneId,
            deliveryZoneId,
            pickupZoneName,
            deliveryZoneName,
            availableDeliveryZones: matchingZones,
            pallets: [],
          };
        }
      }
    }
  } else {
    // If no complete address, don't set delivery zone
    deliveryZoneId = null;
    deliveryZoneName = null;
  }

  // Get pallets that match the zones
  let pallets: PalletInfo[] = [];
  if (pickupZoneId && deliveryZoneId) {
    const { data: matchingPallets, error: palletsError } = await sb
      .from("pallets")
      .select(
        `
        id,
        name,
        bottle_capacity,
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
        });
      }
    }
  }

  return {
    pickupZoneId,
    deliveryZoneId,
    pickupZoneName,
    deliveryZoneName,
    pallets,
  };
}
