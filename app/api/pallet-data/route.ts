import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
