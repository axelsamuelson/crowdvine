import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    // Get the current active pallet (most recent one)
    const { data: pallet, error: palletError } = await sb
      .from("pallets")
      .select(`
        id,
        name,
        description,
        bottle_capacity,
        cost_cents,
        created_at,
        delivery_zone:pallet_zones!delivery_zone_id(
          id,
          name,
          zone_type
        ),
        pickup_zone:pallet_zones!pickup_zone_id(
          id,
          name,
          zone_type
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (palletError) {
      console.error("Error fetching current pallet:", palletError);
      return NextResponse.json(
        { error: "Failed to fetch current pallet" },
        { status: 500 }
      );
    }

    if (!pallet) {
      // Return mock data for demonstration
      const mockPallet = {
        id: "mock-pallet-1",
        name: "The Languedoc Mixed Pallet",
        description: "This pallet brings together some of the most exciting producers in southern France. By joining, you don't just buy wine – you unlock access to bottles usually reserved for restaurants and importers.",
        bottle_capacity: 600,
        cost_cents: 15000, // 150 SEK
        delivery_zone: {
          id: "mock-delivery-zone",
          name: "Stockholm Delivery Zone",
          zone_type: "delivery"
        },
        pickup_zone: {
          id: "mock-pickup-zone", 
          name: "Stockholm Pickup Point",
          zone_type: "pickup"
        },
        created_at: new Date().toISOString(),
      };

      const mockProgress = {
        bottles_reserved: 542,
        total_capacity: 600,
        percentage: 90,
        days_until_deadline: 3,
      };

      const mockProducers = [
        { id: "1", name: "Domaine de la Clape", region: "Languedoc", country_code: "FR" },
        { id: "2", name: "Château de Lascaux", region: "Languedoc", country_code: "FR" },
        { id: "3", name: "Mas de Daumas Gassac", region: "Languedoc", country_code: "FR" },
      ];

      return NextResponse.json({
        pallet: mockPallet,
        progress: mockProgress,
        producers: mockProducers,
      });
    }

    // Get current reservations for this pallet
    const { data: reservations, error: reservationsError } = await sb
      .from("order_reservations")
      .select(`
        id,
        status,
        order_reservation_items(
          quantity
        )
      `)
      .eq("pallet_id", pallet.id)
      .eq("status", "confirmed");

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      // Continue without reservation data
    }

    // Calculate total bottles reserved
    const totalBottlesReserved = reservations?.reduce((total, reservation) => {
      const reservationTotal = reservation.order_reservation_items?.reduce(
        (itemTotal, item) => itemTotal + item.quantity,
        0
      ) || 0;
      return total + reservationTotal;
    }, 0) || 0;

    // Get producers for this pallet (from wines in the system)
    const { data: producers, error: producersError } = await sb
      .from("producers")
      .select(`
        id,
        name,
        region,
        country_code
      `)
      .limit(5); // Show top 5 producers

    if (producersError) {
      console.error("Error fetching producers:", producersError);
      // Continue without producer data
    }

    // Calculate progress percentage
    const progressPercentage = Math.min(
      (totalBottlesReserved / pallet.bottle_capacity) * 100,
      100
    );

    // Calculate days until deadline (assuming 30 days from creation)
    const createdAt = new Date(pallet.created_at);
    const deadline = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = new Date();
    const daysUntilDeadline = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return NextResponse.json({
      pallet: {
        id: pallet.id,
        name: pallet.name,
        description: pallet.description,
        bottle_capacity: pallet.bottle_capacity,
        cost_cents: pallet.cost_cents,
        delivery_zone: pallet.delivery_zone,
        pickup_zone: pallet.pickup_zone,
        created_at: pallet.created_at,
      },
      progress: {
        bottles_reserved: totalBottlesReserved,
        total_capacity: pallet.bottle_capacity,
        percentage: Math.round(progressPercentage),
        days_until_deadline: daysUntilDeadline,
      },
      producers: producers || [],
    });
  } catch (error) {
    console.error("Error in current pallet API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
