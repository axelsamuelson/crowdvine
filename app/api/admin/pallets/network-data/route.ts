import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const palletId = searchParams.get("palletId");

  const supabase = getSupabaseAdmin();

  try {
    if (palletId) {
      // Get specific pallet with producers and reservations
      const { data: pallet, error: palletError } = await supabase
        .from("pallets")
        .select("*")
        .eq("id", palletId)
        .single();

      if (palletError || !pallet) {
        return NextResponse.json(
          { error: "Pallet not found" },
          { status: 404 }
        );
      }

      // Get reservations for this pallet
      const { data: reservations, error: reservationsError } = await supabase
        .from("order_reservations")
        .select(
          `
          id,
          status,
          pallet_id,
          order_reservation_items (
            id,
            wine_id,
            quantity,
            wines (
              id,
              wine_name,
              producer_id,
              producers (
                id,
                name
              )
            )
          )
        `
        )
        .eq("pallet_id", palletId)
        .in("status", ["placed", "approved", "partly_approved", "pending_payment", "confirmed"]);

      if (reservationsError) {
        console.error("Error fetching reservations:", reservationsError);
      }

      // Aggregate bottles by producer
      const producerBottles: Record<
        string,
        { producerId: string; producerName: string; bottles: number }
      > = {};

      reservations?.forEach((reservation) => {
        const items = reservation.order_reservation_items || [];
        items.forEach((item: any) => {
          const wine = item.wines;
          if (wine?.producer_id && wine.producers) {
            const producerId = wine.producer_id;
            const producerName = wine.producers.name || "Unknown";
            const quantity = item.quantity || 0;

            if (!producerBottles[producerId]) {
              producerBottles[producerId] = {
                producerId,
                producerName,
                bottles: 0,
              };
            }
            producerBottles[producerId].bottles += quantity;
          }
        });
      });

      // Get producer details
      const producerIds = Object.keys(producerBottles);
      const { data: producers } = await supabase
        .from("producers")
        .select("id, name, region")
        .in("id", producerIds);

      const totalBottles = Object.values(producerBottles).reduce(
        (sum, p) => sum + p.bottles,
        0
      );

      return NextResponse.json({
        pallet: {
          id: pallet.id,
          name: pallet.name || "Unnamed Pallet",
          bottleCapacity: pallet.bottle_capacity || 700,
          currentBottles: totalBottles,
          percentage: pallet.bottle_capacity
            ? (totalBottles / pallet.bottle_capacity) * 100
            : 0,
          status: pallet.status,
          isComplete: pallet.is_complete || false,
        },
        producers: Object.values(producerBottles).map((pb) => ({
          id: pb.producerId,
          name: pb.producerName,
          bottles: pb.bottles,
          ...(producers?.find((p) => p.id === pb.producerId) || {}),
        })),
      });
    } else {
      // Get all active pallets
      const { data: pallets, error: palletsError } = await supabase
        .from("pallets")
        .select("*")
        .in("status", ["active", "pending", "complete"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (palletsError) {
        return NextResponse.json(
          { error: "Failed to fetch pallets" },
          { status: 500 }
        );
      }

      // For each pallet, get producer data
      const palletsWithData = await Promise.all(
        (pallets || []).map(async (pallet) => {
          const { data: reservations } = await supabase
            .from("order_reservations")
            .select(
              `
              order_reservation_items (
                quantity,
                wines (
                  producer_id,
                  producers (
                    id,
                    name
                  )
                )
              )
            `
            )
            .eq("pallet_id", pallet.id)
            .in("status", ["placed", "approved", "partly_approved", "pending_payment", "confirmed"]);

          const producerBottles: Record<string, number> = {};
          let totalBottles = 0;

          reservations?.forEach((reservation: any) => {
            const items = reservation.order_reservation_items || [];
            items.forEach((item: any) => {
              const producerId = item.wines?.producer_id;
              const quantity = item.quantity || 0;
              if (producerId) {
                producerBottles[producerId] =
                  (producerBottles[producerId] || 0) + quantity;
                totalBottles += quantity;
              }
            });
          });

          return {
            id: pallet.id,
            name: pallet.name || "Unnamed Pallet",
            bottleCapacity: pallet.bottle_capacity || 700,
            currentBottles: totalBottles,
            percentage: pallet.bottle_capacity
              ? (totalBottles / pallet.bottle_capacity) * 100
              : 0,
            status: pallet.status,
            isComplete: pallet.is_complete || false,
            producerCount: Object.keys(producerBottles).length,
          };
        })
      );

      return NextResponse.json({ pallets: palletsWithData });
    }
  } catch (error) {
    console.error("Error in network-data API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

