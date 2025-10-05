import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sb = getSupabaseAdmin();
    const resolvedParams = await params;
    const palletId = resolvedParams.id;

    // Get pallet information
    const { data: pallet, error: palletError } = await sb
      .from("pallets")
      .select("id, name, bottle_capacity, status, pickup_zone_id, delivery_zone_id")
      .eq("id", palletId)
      .single();

    if (palletError || !pallet) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    // Get all reservations for this pallet
    const { data: reservations, error: reservationsError } = await sb
      .from("order_reservations")
      .select(`
        id,
        status,
        created_at,
        order_reservation_items(
          quantity,
          wines(
            wine_name,
            vintage,
            color,
            grape_varieties,
            label_image_path
          )
        )
      `)
      .eq("pickup_zone_id", pallet.pickup_zone_id)
      .eq("delivery_zone_id", pallet.delivery_zone_id);

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
      return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }

    // Calculate total reserved bottles across all reservations
    let totalReservedBottles = 0;
    const allWines: any[] = [];

    reservations?.forEach((reservation) => {
      reservation.order_reservation_items?.forEach((item: any) => {
        totalReservedBottles += item.quantity;
        allWines.push({
          wine_name: item.wines?.wine_name || "Unknown Wine",
          vintage: item.wines?.vintage || "N/A",
          color: item.wines?.color || "Unknown",
          grape_varieties: item.wines?.grape_varieties || "Unknown",
          quantity: item.quantity,
          image_path: item.wines?.label_image_path || null,
        });
      });
    });

    // Group wines by name + vintage to get totals
    const wineTotals = allWines.reduce((acc: any, wine) => {
      const key = `${wine.wine_name}_${wine.vintage}`;
      if (!acc[key]) {
        acc[key] = {
          wine_name: wine.wine_name,
          vintage: wine.vintage,
          color: wine.color,
          grape_varieties: wine.grape_varieties,
          total_quantity: 0,
          image_path: wine.image_path,
        };
      }
      acc[key].total_quantity += wine.quantity;
      return acc;
    }, {});

    // Calculate percentage filled
    const percentageFilled = pallet.bottle_capacity > 0 
      ? Math.round((totalReservedBottles / pallet.bottle_capacity) * 100)
      : 0;

    return NextResponse.json({
      id: pallet.id,
      name: pallet.name,
      status: pallet.status,
      bottle_capacity: pallet.bottle_capacity,
      total_reserved_bottles: totalReservedBottles,
      percentage_filled: percentageFilled,
      wines: Object.values(wineTotals),
      reservations: reservations || [],
    });
  } catch (error) {
    console.error("Unexpected error in pallet API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
