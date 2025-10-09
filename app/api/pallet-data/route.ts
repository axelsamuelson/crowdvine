import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// GET all pallets (for invitation page, etc.)
export async function GET(request: NextRequest) {
  try {
    const sb = getSupabaseAdmin();

    // Fetch all pallets with zone info
    const { data: pallets, error } = await sb
      .from("pallets")
      .select(`
        id,
        from_zone_id,
        to_zone_id,
        capacity_bottles,
        status
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching pallets:", error);
      return NextResponse.json({ error: "Failed to fetch pallets" }, { status: 500 });
    }

    // Calculate total bottles for each pallet and fetch zone names
    const palletsWithData = await Promise.all(
      (pallets || []).map(async (pallet: any) => {
        // Get zone names
        const { data: fromZone } = await sb
          .from("pallet_zones")
          .select("name")
          .eq("id", pallet.from_zone_id)
          .maybeSingle();

        const { data: toZone } = await sb
          .from("pallet_zones")
          .select("name")
          .eq("id", pallet.to_zone_id)
          .maybeSingle();

        // Count total bottles on this pallet
        const { count } = await sb
          .from("order_reservation_items")
          .select("*", { count: 'exact', head: true })
          .eq("pallet_id", pallet.id);

        const totalBottles = count || 0;

        return {
          id: pallet.id,
          from_zone_name: fromZone?.name || "Unknown",
          to_zone_name: toZone?.name || "Unknown",
          capacity_bottles: pallet.capacity_bottles || 720,
          total_bottles_on_pallet: totalBottles,
          status: pallet.status
        };
      })
    );

    return NextResponse.json(palletsWithData);
  } catch (error) {
    console.error("Pallet data GET error:", error);
    return NextResponse.json({ error: "Failed to fetch pallet data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { palletIds } = await request.json();

    if (!palletIds || !Array.isArray(palletIds)) {
      return NextResponse.json({ error: "Invalid pallet IDs" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();

    // Get pallet information
    const { data: pallets, error: palletsError } = await sb
      .from("pallets")
      .select("id, name, bottle_capacity")
      .in("id", palletIds);

    if (palletsError) {
      console.error("Error fetching pallets:", palletsError);
      return NextResponse.json({ error: "Failed to fetch pallets" }, { status: 500 });
    }

    // Get current bottle count for each pallet from bookings
    const palletsWithBottles = await Promise.all(
      (pallets || []).map(async (pallet) => {
        const { data: bookings, error: bookingsError } = await sb
          .from("bookings")
          .select("quantity")
          .eq("pallet_id", pallet.id);

        const currentBottles = bookingsError
          ? 0
          : bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;

        return {
          id: pallet.id,
          name: pallet.name,
          bottle_capacity: pallet.bottle_capacity,
          current_bottles: currentBottles,
        };
      })
    );

    console.log(`✅ Fetched ${palletsWithBottles.length} pallets with bottle counts`);

    return NextResponse.json({ pallets: palletsWithBottles });
  } catch (error) {
    console.error("Pallet data API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
