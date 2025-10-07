import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin();

    // Get the current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      console.log("No authenticated user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const palletId = params.id;
    console.log(`Fetching all reservations for pallet: ${palletId}`);

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

    // Get all reservations for this pallet (matching zones or pallet_id)
    // Try matching by pallet_id first (if column exists), otherwise fall back to zones
    let reservations;
    let reservationsError;
    
    // First try: Match by pallet_id if the column exists
    const { data: reservationsByPalletId, error: palletIdError } = await supabase
      .from("order_reservations")
      .select(`
        id,
        order_id,
        user_id,
        status,
        created_at,
        pallet_id,
        profiles!inner(
          email,
          full_name
        )
      `)
      .eq("pallet_id", palletId)
      .order("created_at", { ascending: false });
    
    if (!palletIdError && reservationsByPalletId && reservationsByPalletId.length > 0) {
      console.log(`Found ${reservationsByPalletId.length} reservations by pallet_id`);
      reservations = reservationsByPalletId;
      reservationsError = null;
    } else {
      // Fallback: Match by zones
      console.log(`Trying zone-based matching: pickup=${pallet.pickup_zone_id}, delivery=${pallet.delivery_zone_id}`);
      const { data: reservationsByZones, error: zonesError } = await supabase
        .from("order_reservations")
        .select(`
          id,
          order_id,
          user_id,
          status,
          created_at,
          profiles!inner(
            email,
            full_name
          )
        `)
        .eq("pickup_zone_id", pallet.pickup_zone_id)
        .eq("delivery_zone_id", pallet.delivery_zone_id)
        .order("created_at", { ascending: false });
      
      reservations = reservationsByZones;
      reservationsError = zonesError;
      console.log(`Found ${reservationsByZones?.length || 0} reservations by zones`);
    }

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    console.log(
      `Found ${reservations?.length || 0} reservations for pallet ${palletId}`,
    );

    // If no reservations, return empty array
    if (!reservations || reservations.length === 0) {
      return NextResponse.json([]);
    }

    // Get items for each reservation
    const reservationsWithItems = await Promise.all(
      reservations.map(async (reservation) => {
        // Get reservation items with wine details
        const { data: items } = await supabase
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
              color
            )
          `,
          )
          .eq("reservation_id", reservation.id);

        const itemsData =
          items?.map((item) => ({
            wine_name: item.wines?.wine_name || "Unknown Wine",
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

        return {
          id: reservation.id,
          order_id: reservation.order_id || reservation.id,
          user_id: reservation.user_id,
          user_name: reservation.profiles?.full_name || "Unknown User",
          user_email: reservation.profiles?.email || "",
          bottles_reserved: bottlesReserved,
          bottles_delivered: 0, // TODO: Get from backend
          status: reservation.status,
          created_at: reservation.created_at,
          items: itemsData,
        };
      }),
    );

    return NextResponse.json(reservationsWithItems);
  } catch (error) {
    console.error("Pallet reservations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

