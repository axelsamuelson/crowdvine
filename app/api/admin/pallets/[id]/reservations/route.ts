import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin endpoint to get all reservations for a specific pallet
 * No user auth required - admin only
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Admin auth cookie check (consistent with other admin routes)
    const cookie = request.headers.get("cookie") || "";
    if (!cookie.includes("admin-auth=true")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const palletId = (await params).id;

    console.log(`[Admin] Fetching all reservations for pallet: ${palletId}`);

    // First, get the pallet to verify it exists
    const { data: pallet, error: palletError } = await supabase
      .from("pallets")
      .select("id, name, pickup_zone_id, delivery_zone_id, bottle_capacity")
      .eq("id", palletId)
      .maybeSingle();

    if (palletError || !pallet) {
      console.error("[Admin] Error fetching pallet:", palletError);
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    // Data-driven mapping:
    // We consider active reservations that deliver to this pallet's delivery zone,
    // then derive pickup_zone_id from the wines inside the reservation (via producers.pickup_zone_id).
    // This stays correct even if producers are re-linked later.
    const activeStatuses = ["placed", "approved", "partly_approved", "pending_payment", "confirmed"];

    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(
        "id, user_id, status, created_at, delivery_zone_id",
      )
      .in("status", activeStatuses)
      .eq("delivery_zone_id", pallet.delivery_zone_id)
      .order("created_at", { ascending: false });

    if (reservationsError) {
      console.error("[Admin] Error fetching reservations:", reservationsError);
      return NextResponse.json(
        {
          error: "Failed to fetch reservations",
          details: reservationsError.message,
        },
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

    const reservationIds = reservations.map((r) => r.id);

    // Fetch reservation items for all reservations (batch)
    const { data: items, error: itemsError } = await supabase
      .from("order_reservation_items")
      .select(
        `
        reservation_id,
        item_id,
        quantity,
        wines(
          wine_name,
          vintage,
          label_image_path,
          grape_varieties,
          color,
          base_price_cents,
          producer_id,
          producers(name, pickup_zone_id)
        )
      `,
      )
      .in("reservation_id", reservationIds);

    if (itemsError) {
      console.error("[Admin] Error fetching reservation items:", itemsError);
      return NextResponse.json(
        {
          error: "Failed to fetch reservation items",
          details: itemsError.message,
        },
        { status: 500 },
      );
    }

    // Fetch profiles in one go
    const userIds = Array.from(
      new Set(reservations.map((r) => r.user_id).filter(Boolean)),
    ) as string[];
    const profilesById = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      (profiles || []).forEach((p: any) => profilesById.set(p.id, p));
    }

    // Build reservation -> items
    const itemsByReservationId = new Map<string, any[]>();
    for (const it of items || []) {
      const arr = itemsByReservationId.get(it.reservation_id) || [];
      arr.push(it);
      itemsByReservationId.set(it.reservation_id, arr);
    }

    // Filter reservations to only those that map to THIS pallet's pickup zone
    const reservationsWithItems = reservations
      .map((reservation) => {
        const resItems = itemsByReservationId.get(reservation.id) || [];

        const pickupZones = new Set<string>();
        resItems.forEach((it: any) => {
          const pz = it?.wines?.producers?.pickup_zone_id;
          if (pz) pickupZones.add(pz);
        });

        // Only include if we can derive exactly one pickup zone and it matches this pallet.
        if (pickupZones.size !== 1) return null;
        const derivedPickupZoneId = Array.from(pickupZones)[0];
        if (derivedPickupZoneId !== pallet.pickup_zone_id) return null;

        const itemsData =
          resItems.map((item: any) => ({
            wine_name: item.wines?.wine_name || "Unknown Wine",
            producer_name: item.wines?.producers?.name || "Unknown Producer",
            quantity: item.quantity,
            // Use the wine base price (this table doesn't store price_cents in all DBs)
            price_cents: item.wines?.base_price_cents || 0,
            vintage: item.wines?.vintage || "N/A",
            image_path: item.wines?.label_image_path || null,
            grape_varieties: item.wines?.grape_varieties || null,
            color: item.wines?.color || null,
          })) || [];

        const bottlesReserved = itemsData.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        const totalCostCents = itemsData.reduce(
          (sum, item) => sum + (item.price_cents || 0) * (item.quantity || 0),
          0,
        );

        const profile = profilesById.get(reservation.user_id) || null;

        return {
          id: reservation.id,
          order_id: reservation.id,
          user_id: reservation.user_id,
          user_name: profile?.full_name || "Unknown User",
          user_email: profile?.email || "",
          total_bottles: bottlesReserved,
          total_cost_cents: totalCostCents,
          bottles_delivered: 0,
          status: reservation.status,
          created_at: reservation.created_at,
          items: itemsData,
        };
      })
      .filter(Boolean);

    console.log(
      `[Admin] Returning ${reservationsWithItems.length} reservations with full details`,
    );

    return NextResponse.json(reservationsWithItems);
  } catch (error) {
    console.error("[Admin] Pallet reservations API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
