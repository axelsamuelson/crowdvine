import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    // Note: This endpoint is public - no authentication required
    // Anyone can view pallet details and participants
    
    const palletId = params.id;
    console.log(`[Public] Fetching all reservations for pallet: ${palletId}`);

    // First, get the pallet to find its zones
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id, bottle_capacity")
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      console.error("Error fetching pallet:", palletError);
      return NextResponse.json(
        { error: "Pallet not found" },
        { status: 404 },
      );
    }

    // Get all reservations for this pallet (using pallet_id directly)
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select("id, user_id, status, created_at")
      .eq("pallet_id", palletId)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    console.log(
      `[Public] Found ${reservations?.length || 0} reservations for pallet ${palletId}`,
    );

    // If no reservations, return empty array
    if (!reservations || reservations.length === 0) {
      console.log('[Public] No reservations found, returning empty array');
      return NextResponse.json([]);
    }

    console.log(`[Public] Processing ${reservations.length} reservations to fetch items...`);

    // Get items for each reservation
    const reservationsWithItems = await Promise.all(
      reservations.map(async (reservation, idx) => {
        console.log(`[Public] Processing reservation ${idx + 1}/${reservations.length}: ${reservation.id}`);
        // Get user profile separately
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", reservation.user_id)
          .single();

        // Get reservation items with wine details
        const { data: items, error: itemsError } = await supabase
          .from("order_reservation_items")
          .select(
            `
            item_id,
            quantity,
            wines(
              wine_name,
              vintage,
              label_image_path,
              grape_varieties,
              color,
              producer_id
            )
          `,
          )
          .eq("reservation_id", reservation.id);

        if (itemsError) {
          console.error(`[Public] Error fetching items for reservation ${reservation.id}:`, itemsError);
        }
        
        console.log(`[Public] Reservation ${reservation.id}: Found ${items?.length || 0} items`);

        // Get producer names for all items
        const producerIds = items?.map(item => item.wines?.producer_id).filter(Boolean) || [];
        const uniqueProducerIds = [...new Set(producerIds)];
        
        const producerNamesMap = new Map();
        if (uniqueProducerIds.length > 0) {
          const { data: producers } = await supabase
            .from("producers")
            .select("id, name")
            .in("id", uniqueProducerIds);
          
          producers?.forEach(p => producerNamesMap.set(p.id, p.name));
        }

        const itemsData =
          items?.map((item) => ({
            wine_name: item.wines?.wine_name || "Unknown Wine",
            producer_name: producerNamesMap.get(item.wines?.producer_id) || "Unknown Producer",
            quantity: item.quantity,
            vintage: item.wines?.vintage || "N/A",
            image_path: item.wines?.label_image_path || null,
            grape_varieties: item.wines?.grape_varieties || null,
            color: item.wines?.color || null,
          })) || [];

        const bottlesReserved = itemsData.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        console.log(`[Public] Reservation ${reservation.id}: ${bottlesReserved} bottles, ${itemsData.length} unique items`);

        return {
          id: reservation.id,
          order_id: reservation.id, // Use reservation.id as order_id
          user_id: reservation.user_id,
          user_name: profile?.full_name || "Unknown User",
          user_email: profile?.email || "",
          total_bottles: bottlesReserved,
          bottles_reserved: bottlesReserved, // Add this for frontend compatibility
          total_cost_cents: 0,
          bottles_delivered: 0,
          status: reservation.status,
          created_at: reservation.created_at,
          items: itemsData,
        };
      }),
    );

    console.log(`[Public] Returning ${reservationsWithItems.length} reservations with items`);
    console.log(`[Public] Sample reservation:`, JSON.stringify(reservationsWithItems[0], null, 2));

    return NextResponse.json(reservationsWithItems);
  } catch (error) {
    console.error("Pallet reservations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

