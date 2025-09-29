import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    
    console.log("🔍 Debug: Starting pallet fetch...");
    
    // First try a simple query to check if the table exists
    const { data, error } = await sb
      .from("pallets")
      .select("id, name, bottle_capacity")
      .limit(1);

    console.log("🔍 Debug: Simple query result:", { data, error });

    if (error) {
      console.error("Error fetching pallets:", error);
      // Return debug info instead of empty array
      return NextResponse.json({ 
        debug: true,
        error: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint
      });
    }

    // Handle case when no pallets exist
    if (!data || data.length === 0) {
      console.log("🔍 Debug: No pallets found in database");
      return NextResponse.json({ 
        debug: true,
        message: "No pallets found",
        data: data,
        count: 0
      });
    }

    // If we have pallets, try to get full data
    const { data: fullData, error: fullError } = await sb
      .from("pallets")
      .select(
        `
        *,
        delivery_zone:pallet_zones!delivery_zone_id(id, name, zone_type),
        pickup_zone:pallet_zones!pickup_zone_id(id, name, zone_type),
        bookings(
          quantity,
          wines(
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            producers(
              name,
              region,
              country_code
            )
          )
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (fullError) {
      console.error("Error fetching full pallet data:", fullError);
      // Return simple data if complex query fails
      return NextResponse.json(data.map(pallet => ({
        ...pallet,
        total_booked_bottles: 0,
        remaining_bottles: pallet.bottle_capacity,
        completion_percentage: 0,
        wine_summary: [],
        is_complete: false,
        needs_ordering: true,
      })));
    }

    // Transform data to include calculated fields
    const transformedData = fullData.map((pallet) => {
      const totalBookedBottles =
        pallet.bookings?.reduce((sum, booking) => sum + booking.quantity, 0) || 0;
      const remainingBottles = pallet.bottle_capacity - totalBookedBottles;
      const completionPercentage =
        (totalBookedBottles / pallet.bottle_capacity) * 100;

      // Group wines by type for summary
      const wineSummary =
        pallet.bookings?.reduce(
          (acc, booking) => {
            const wine = booking.wines;
            const key = `${wine.wine_name}-${wine.vintage}`;
            if (!acc[key]) {
              acc[key] = {
                wine_name: wine.wine_name,
                vintage: wine.vintage,
                grape_varieties: wine.grape_varieties,
                color: wine.color,
                producer: wine.producers.name,
                total_quantity: 0,
                base_price_cents: wine.base_price_cents,
              };
            }
            acc[key].total_quantity += booking.quantity;
            return acc;
          },
          {} as Record<string, any>,
        ) || {};

      return {
        ...pallet,
        total_booked_bottles: totalBookedBottles,
        remaining_bottles: remainingBottles,
        completion_percentage: completionPercentage,
        wine_summary: Object.values(wineSummary),
        is_complete: totalBookedBottles >= pallet.bottle_capacity,
        needs_ordering: remainingBottles > 0,
      };
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error("Unexpected error in pallets API:", error);
    // Return empty array on any unexpected error
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const { data, error } = await sb
    .from("pallets")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
