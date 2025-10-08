import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin endpoint to get all reservations for a specific pallet
 * No user auth required - admin only
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();
    const palletId = params.id;

    console.log(`[Admin] Fetching all reservations for pallet: ${palletId}`);

    // First, get the pallet to verify it exists
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id, bottle_capacity")
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      console.error("[Admin] Error fetching pallet:", palletError);
      return NextResponse.json(
        { error: "Pallet not found" },
        { status: 404 },
      );
    }

    // Get all reservations for this pallet (using pallet_id directly)
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select("id, order_id, user_id, status, created_at, delivery_address, total_cost_cents")
      .eq("pallet_id", palletId)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("[Admin] Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to fetch reservations", details: reservationsError.message },
        { status: 500 },
      );
    }

    console.log(
      `[Admin] Found ${reservations?.length || 0} reservations for pallet ${palletId}`,
    );

    // If no reservations, return empty array
    if (!reservations || reservations.length === 0) {
      return NextResponse.json([]);
    }

    // Get items for each reservation
    const reservationsWithItems = await Promise.all(
      reservations.map(async (reservation) => {
        // Get user profile separately
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", reservation.user_id)
          .single();

        // Get reservation items with wine and producer details
        const { data: items, error: itemsError } = await supabase
          .from("order_reservation_items")
          .select(
            `
            item_id,
            quantity,
            price_cents,
            wines(
              wine_name,
              vintage,
              label_image_path,
              grape_varieties,
              color,
              producer_id,
              producers(name)
            )
          `,
          )
          .eq("reservation_id", reservation.id);

        if (itemsError) {
          console.error(`[Admin] Error fetching items for reservation ${reservation.id}:`, itemsError);
        }

        const itemsData =
          items?.map((item) => ({
            wine_name: item.wines?.wine_name || "Unknown Wine",
            producer_name: item.wines?.producers?.name || "Unknown Producer",
            quantity: item.quantity,
            price_cents: item.price_cents || 0,
            vintage: item.wines?.vintage || "N/A",
            image_path: item.wines?.label_image_path || null,
            grape_varieties: item.wines?.grape_varieties || null,
            color: item.wines?.color || null,
          })) || [];

        const bottlesReserved = itemsData.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        return {
          id: reservation.id,
          order_id: reservation.order_id,
          user_id: reservation.user_id,
          user_name: profile?.full_name || "Unknown User",
          user_email: profile?.email || "",
          total_bottles: bottlesReserved,
          total_cost_cents: reservation.total_cost_cents || 0,
          bottles_delivered: 0, // TODO: Get from backend
          status: reservation.status,
          created_at: reservation.created_at,
          delivery_address: reservation.delivery_address,
          items: itemsData,
        };
      }),
    );

    console.log(`[Admin] Returning ${reservationsWithItems.length} reservations with full details`);

    return NextResponse.json(reservationsWithItems);
  } catch (error) {
    console.error("[Admin] Pallet reservations API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

