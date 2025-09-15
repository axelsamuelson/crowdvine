// Cloudflare Pages Function - User Reservations
// Get user reservations with related data

import { success, error, unauthorized, internalError, corsHeaders, cache } from '../_lib/response'
import { getSupabasePublic, getUserFromRequest } from '../_lib/supabase'

export async function onRequestGet(ctx: any) {
  const { request, env } = ctx
  
  try {
    const userId = getUserFromRequest(request)
    
    if (!userId) {
      return unauthorized('Authentication required')
    }

    const supabase = getSupabasePublic(env)

    // Get user reservations with related data
    const { data: reservations, error: reservationsError } = await supabase
      .from('order_reservations')
      .select(`
        id,
        order_id,
        status,
        created_at,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        delivery_address,
        total_amount_cents,
        shipping_cost_cents,
        pallets(name, cost_cents, bottle_capacity),
        pallet_zones!order_reservations_pickup_zone_id_fkey(name),
        pallet_zones!order_reservations_delivery_zone_id_fkey(name),
        order_reservation_items(
          wine_id,
          quantity,
          wines(wine_name, vintage, base_price_cents, label_image_path)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (reservationsError) {
      console.error('Error fetching reservations:', reservationsError)
      return internalError('Failed to fetch reservations')
    }

    // Transform the data to match expected format
    const transformedReservations = reservations?.map(reservation => {
      // Handle zone data properly
      const pickupZone = Array.isArray(reservation.pallet_zones)
        ? reservation.pallet_zones.find((zone: any) => zone.id === reservation.pickup_zone_id)
        : reservation.pallet_zones

      const deliveryZone = Array.isArray(reservation.pallet_zones)
        ? reservation.pallet_zones.find((zone: any) => zone.id === reservation.delivery_zone_id)
        : reservation.pallet_zones

      return {
        id: reservation.id,
        order_id: reservation.order_id,
        status: reservation.status,
        created_at: reservation.created_at,
        pallet_id: reservation.pallet_id,
        pallet_name: reservation.pallets?.[0]?.name || 'Unknown Pallet',
        pallet_cost_cents: reservation.pallets?.[0]?.cost_cents || 0,
        pallet_capacity: reservation.pallets?.[0]?.bottle_capacity || 0,
        pickup_zone: pickupZone?.name || 'Unknown Pickup Zone',
        delivery_zone: deliveryZone?.name || 'Unknown Delivery Zone',
        delivery_address: reservation.delivery_address || null,
        total_amount_cents: reservation.total_amount_cents || 0,
        shipping_cost_cents: reservation.shipping_cost_cents || 0,
        items: reservation.order_reservation_items?.map((item: any) => ({
          wine_name: item.wines?.[0]?.wine_name || 'Unknown Wine',
          quantity: item.quantity,
          vintage: item.wines?.[0]?.vintage || 'N/A',
          price_cents: item.wines?.[0]?.base_price_cents || 0,
          image_path: item.wines?.[0]?.label_image_path || null
        })) || []
      }
    }) || []

    const response = success(transformedReservations, 'Reservations fetched successfully')

    // Add caching headers
    Object.entries(cache(60)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    // Add CORS headers
    Object.entries(corsHeaders(request.headers.get('Origin') || undefined)).forEach(
      ([key, value]) => response.headers.set(key, value)
    )

    return response

  } catch (err) {
    console.error('Reservations fetch error:', err)
    return internalError('Failed to fetch reservations')
  }
}

export async function onRequestOptions(ctx: any) {
  const { request } = ctx
  
  return new Response(null, {
    status: 200,
    headers: corsHeaders(request.headers.get('Origin') || undefined)
  })
}