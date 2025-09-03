import { supabaseServer } from './supabase-server';

export interface ZoneMatchResult {
  pickupZoneId: string | null;
  deliveryZoneId: string | null;
  pickupZoneName: string | null;
  deliveryZoneName: string | null;
  pallets?: PalletInfo[];
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
  deliveryAddress: DeliveryAddress
): Promise<ZoneMatchResult> {
  const sb = await supabaseServer();
  
  // Get unique producer IDs from cart items
  const { data: wines, error: winesError } = await sb
    .from('wines')
    .select('id, producer_id')
    .in('id', cartItems.map(item => item.merchandise.id));
  
  if (winesError || !wines) {
    console.error('Failed to fetch wines for zone matching:', winesError);
    return { pickupZoneId: null, deliveryZoneId: null, pickupZoneName: null, deliveryZoneName: null };
  }
  
  const producerIds = [...new Set(wines.map(wine => wine.producer_id))];
  
  // Get producers with their pickup zones
  const { data: producers, error: producersError } = await sb
    .from('producers')
    .select(`
      id,
      name,
      pickup_zone_id,
      pallet_zones!pickup_zone_id (
        id,
        name,
        zone_type
      )
    `)
    .in('id', producerIds);
  
  if (producersError || !producers) {
    console.error('Failed to fetch producers for zone matching:', producersError);
    return { pickupZoneId: null, deliveryZoneId: null, pickupZoneName: null, deliveryZoneName: null };
  }
  
  // Determine pickup zone (use the first producer's pickup zone)
  const pickupZone = producers[0]?.pallet_zones;
  const pickupZoneId = pickupZone?.id || null;
  const pickupZoneName = pickupZone?.name || null;
  
  // For delivery zone, we'll use a simple approach based on country code
  // In a real implementation, you might want to use geocoding to determine the closest delivery zone
  let deliveryZoneId: string | null = null;
  let deliveryZoneName: string | null = null;
  
  // Only set delivery zone if we have a valid delivery address
  if (deliveryAddress.countryCode && deliveryAddress.city && deliveryAddress.postcode) {
    if (deliveryAddress.countryCode === 'SE') {
      // For Sweden, try to find a delivery zone that covers Sweden
      const { data: deliveryZones, error: deliveryZonesError } = await sb
        .from('pallet_zones')
        .select('id, name')
        .eq('zone_type', 'delivery')
        .limit(1);
      
      if (!deliveryZonesError && deliveryZones && deliveryZones.length > 0) {
        deliveryZoneId = deliveryZones[0].id;
        deliveryZoneName = deliveryZones[0].name;
      }
    }
  } else {
    // If no complete address, don't set delivery zone
    deliveryZoneId = null;
    deliveryZoneName = null;
  }
  
  console.log('Zone matching result:', {
    pickupZoneId,
    pickupZoneName,
    deliveryZoneId,
    deliveryZoneName,
    producerIds,
    deliveryAddress
  });
  
  // Get pallets that match the zones
  let pallets: PalletInfo[] = [];
  if (pickupZoneId && deliveryZoneId) {
    const { data: matchingPallets, error: palletsError } = await sb
      .from('pallets')
      .select(`
        id,
        name,
        bottle_capacity,
        pickup_zone_id,
        delivery_zone_id
      `)
      .eq('pickup_zone_id', pickupZoneId)
      .eq('delivery_zone_id', deliveryZoneId);
    
    if (!palletsError && matchingPallets) {
      // Get current bottle count for each pallet
      for (const pallet of matchingPallets) {
        // Get current bottle count for each pallet using pallet_id
        const { data: bookings, error: bookingsError } = await sb
          .from('bookings')
          .select('quantity')
          .eq('pallet_id', pallet.id);
        
        const currentBottles = bookingsError ? 0 : 
          bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
        
        pallets.push({
          id: pallet.id,
          name: pallet.name,
          currentBottles,
          maxBottles: pallet.bottle_capacity,
          remainingBottles: pallet.bottle_capacity - currentBottles,
          pickupZoneName: pickupZoneName || '',
          deliveryZoneName: deliveryZoneName || ''
        });
      }
    }
  }
  
  return {
    pickupZoneId,
    deliveryZoneId,
    pickupZoneName,
    deliveryZoneName,
    pallets
  };
}
