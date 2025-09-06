import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const sb = await supabaseServer();

  let query = sb.from("pallet_zones").select("*");

  if (type === "delivery") {
    query = query.eq("zone_type", "delivery");
  } else if (type === "pickup") {
    query = query.eq("zone_type", "pickup");
  }

  const { data, error } = await query.order("name");

  if (error) {
    console.error("Zones API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Hämta pallets separat för att beräkna statistik
  const { data: allPallets } = await sb
    .from("pallets")
    .select("id, name, bottle_capacity, pickup_zone_id, delivery_zone_id");

  // Beräkna statistik för varje zone
  const zonesWithStats = (data || []).map((zone) => {
    const pickupPallets =
      allPallets?.filter((p) => p.pickup_zone_id === zone.id) || [];
    const deliveryPallets =
      allPallets?.filter((p) => p.delivery_zone_id === zone.id) || [];
    const totalPallets = pickupPallets.length + deliveryPallets.length;
    const totalCapacity = [...pickupPallets, ...deliveryPallets].reduce(
      (sum, p) => sum + (p.bottle_capacity || 0),
      0,
    );

    return {
      ...zone,
      totalPallets,
      totalCapacity,
      pickupPallets: pickupPallets.length,
      deliveryPallets: deliveryPallets.length,
    };
  });

  return NextResponse.json(zonesWithStats);
}
