import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    // Get recent reservations (last 24 hours)
    const { data: reservations, error: reservationsError } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        created_at,
        status,
        profiles!inner (
          id,
          email,
          full_name,
          city
        ),
        order_reservation_items (
          quantity,
          wines (
            id,
            wine_name,
            producers (
              id,
              name
            )
          )
        ),
        pallets (
          id,
          name
        )
      `
      )
      .in("status", ["pending_producer_approval", "placed", "approved", "pending_payment", "confirmed"])
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(50);

    if (reservationsError) {
      console.error("Error fetching reservations:", reservationsError);
    }

    // Get active users count (users with reservations in last 7 days)
    const { data: activeUsers, error: activeUsersError } = await supabase
      .from("order_reservations")
      .select("user_id", { count: "exact" })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .in("status", ["pending_producer_approval", "placed", "approved", "pending_payment", "confirmed"]);

    const uniqueActiveUsers = new Set(
      activeUsers?.map((r: any) => r.user_id) || []
    ).size;

    // Get total bottles reserved today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data: todayReservations } = await supabase
      .from("order_reservations")
      .select(
        `
        order_reservation_items (
          quantity
        )
      `
      )
      .gte("created_at", today.toISOString())
      .in("status", ["pending_producer_approval", "placed", "approved", "pending_payment", "confirmed"]);

    let totalBottlesToday = 0;
    todayReservations?.forEach((reservation: any) => {
      const items = reservation.order_reservation_items || [];
      items.forEach((item: any) => {
        totalBottlesToday += item.quantity || 0;
      });
    });

    // Format activity feed
    const activityFeed = (reservations || []).map((reservation: any) => {
      const items = reservation.order_reservation_items || [];
      const totalQuantity = items.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );
      const firstWine = items[0]?.wines;
      const producer = firstWine?.producers;
      const pallet = reservation.pallets;

      return {
        id: reservation.id,
        timestamp: reservation.created_at,
        userName: reservation.profiles?.full_name || reservation.profiles?.email?.split("@")[0] || "Användare",
        city: reservation.profiles?.city || "Okänd stad",
        bottles: totalQuantity,
        producerName: producer?.name || "Okänd producent",
        wineName: firstWine?.wine_name || "Vin",
        palletName: pallet?.name || "Pall",
      };
    });

    return NextResponse.json({
      activeUsers: uniqueActiveUsers,
      bottlesToday: totalBottlesToday,
      activityFeed: activityFeed.slice(0, 20), // Last 20 activities
    });
  } catch (error) {
    console.error("Error in live activity API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

