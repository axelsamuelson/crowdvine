import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/user/pallets/summary
 *
 * Returns summary of pallets the user is participating in
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all reservations for the user with wine details
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        order_reservation_items(
          quantity,
          wines(
            wine_name,
            label_image_path
          )
        )
      `,
      )
      .eq("user_id", user.id);

    if (reservationsError) throw reservationsError;

    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ pallets: [] });
    }

    // Group reservations by pallet
    const palletMap = new Map<
      string,
      {
        palletId: string;
        userBottles: number;
        totalBottles: number | null; // null means not calculated yet
        capacity: number;
        name: string;
        wines: Array<{
          wine_name: string;
          label_image_path: string | null;
          quantity: number;
        }>;
      }
    >();

    // First pass: collect user's bottles and pallet info
    for (const reservation of reservations) {
      // Calculate user's bottles and collect wine info
      const items = reservation.order_reservation_items || [];
      const userBottles = items.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0,
      );

      if (userBottles === 0) continue;

      // Collect unique wines with quantities
      const wineMap = new Map<string, { wine_name: string; label_image_path: string | null; quantity: number }>();
      items.forEach((item: any) => {
        if (item.wines) {
          const wineName = item.wines.wine_name || "Unknown Wine";
          const existing = wineMap.get(wineName);
          if (existing) {
            existing.quantity += item.quantity || 0;
          } else {
            wineMap.set(wineName, {
              wine_name: wineName,
              label_image_path: item.wines.label_image_path || null,
              quantity: item.quantity || 0,
            });
          }
        }
      });
      const wines = Array.from(wineMap.values());

      // Get pallet info
      let palletId: string | null = reservation.pallet_id;
      let palletName = "Unassigned Pallet";
      let palletCapacity = 0;

      if (!palletId && reservation.pickup_zone_id && reservation.delivery_zone_id) {
        // Try to find pallet by zones
        const { data: pallet } = await supabase
          .from("pallets")
          .select("id, name, bottle_capacity")
          .eq("pickup_zone_id", reservation.pickup_zone_id)
          .eq("delivery_zone_id", reservation.delivery_zone_id)
          .single();

        if (pallet) {
          palletId = pallet.id;
          palletName = pallet.name;
          palletCapacity = pallet.bottle_capacity || 0;
        }
      } else if (palletId) {
        // Get pallet info
        const { data: pallet } = await supabase
          .from("pallets")
          .select("id, name, bottle_capacity")
          .eq("id", palletId)
          .single();

        if (pallet) {
          palletName = pallet.name;
          palletCapacity = pallet.bottle_capacity || 0;
        }
      }

      if (!palletId) continue;

      // Update or create pallet entry
      if (palletMap.has(palletId)) {
        const existing = palletMap.get(palletId)!;
        existing.userBottles += userBottles;
        // Merge wines (combine quantities if same wine)
        wines.forEach((wine) => {
          const existingWine = existing.wines.find((w) => w.wine_name === wine.wine_name);
          if (existingWine) {
            existingWine.quantity += wine.quantity;
          } else {
            existing.wines.push(wine);
          }
        });
      } else {
        palletMap.set(palletId, {
          palletId,
          userBottles,
          totalBottles: null, // Will calculate later
          capacity: palletCapacity,
          name: palletName,
          wines: wines,
        });
      }
    }

    // Second pass: calculate total bottles for each pallet
    for (const [palletId, pallet] of palletMap.entries()) {
      if (pallet.totalBottles === null) {
        // Get total bottles in this pallet (all users)
        const { data: allReservations } = await supabase
          .from("order_reservations")
          .select(
            `
            id,
            order_reservation_items(quantity)
          `,
          )
          .eq("pallet_id", palletId);

        const totalBottles =
          allReservations?.reduce((sum, res) => {
            const items = res.order_reservation_items || [];
            return (
              sum +
              items.reduce(
                (itemSum: number, item: any) => itemSum + (item.quantity || 0),
                0,
              )
            );
          }, 0) || 0;

        pallet.totalBottles = totalBottles;
      }
    }

    // Convert map to array and calculate progress
    const pallets = Array.from(palletMap.values()).map((pallet) => {
      const progress = pallet.capacity > 0 ? pallet.totalBottles / pallet.capacity : 0;
      return {
        ...pallet,
        progress: Math.min(progress, 1), // Cap at 100%
      };
    });

    return NextResponse.json({ pallets });
  } catch (error) {
    console.error("Error fetching pallets summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch pallets summary" },
      { status: 500 },
    );
  }
}

