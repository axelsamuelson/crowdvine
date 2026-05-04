import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use service role key for admin operations (bypasses RLS)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase admin credentials");
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  try {
    const sbAdmin = getSupabaseAdmin();

    console.log("🔍 [Reservations API] Starting to fetch reservations...");

    const { data: reservations, error: reservationsError } = await sbAdmin
      .from("order_reservations")
      .select(
        `
        id,
        status,
        payment_status,
        payment_mode,
        created_at,
        user_id,
        delivery_zone_id,
        pickup_zone_id,
        checkout_group_id,
        shipping_region_id,
        cart_id,
        address_id,
        pallet_id,
        market_code,
        country_code,
        region,
        is_conditional,
        charge_blocked_reason,
        delivery:pallet_zones!delivery_zone_id (
          id,
          name
        ),
        shipping_region:shipping_regions!shipping_region_id (
          id,
          name
        ),
        pallet:pallets!pallet_id (
          id,
          name
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (reservationsError) {
      console.error(
        "❌ [Reservations API] Error fetching reservations:",
        reservationsError,
      );
      console.error("Error details:", {
        code: reservationsError.code,
        message: reservationsError.message,
        details: reservationsError.details,
        hint: reservationsError.hint,
      });

      return NextResponse.json({
        reservations: [],
        error: reservationsError.message,
      });
    }

    const baseReservations = Array.isArray(reservations) ? reservations : [];
    console.log(
      `✅ [Reservations API] Found ${baseReservations.length} reservations`,
    );

    if (baseReservations.length === 0) {
      return NextResponse.json({ reservations: [] });
    }

    const reservationIds = baseReservations
      .map((r) => (r && typeof r.id === "string" ? r.id : null))
      .filter((id): id is string => Boolean(id));

    type ItemRowPrice = {
      reservation_id: string;
      quantity: number | null;
      unit_price_sek: number | null;
    };

    type ItemRowFallback = {
      reservation_id: string;
      quantity: number | null;
      wines?: { base_price_cents: number | null } | null;
    };

    const totalByReservation: Record<string, number> = {};
    const bottlesByReservation: Record<string, number> = {};

    if (reservationIds.length > 0) {
      // Prefer order_reservation_items.unit_price_sek when present; fall back to wines.base_price_cents.
      const { data: itemsWithPrice, error: itemsWithPriceError } =
        await sbAdmin
          .from("order_reservation_items")
          .select("reservation_id, quantity, unit_price_sek")
          .in("reservation_id", reservationIds);

      const shouldFallback =
        Boolean(itemsWithPriceError) &&
        typeof itemsWithPriceError?.message === "string" &&
        /unit_price_sek/i.test(itemsWithPriceError.message);

      if (!itemsWithPriceError && Array.isArray(itemsWithPrice)) {
        for (const item of itemsWithPrice as ItemRowPrice[]) {
          const rid = item.reservation_id;
          if (typeof rid !== "string" || rid.length === 0) continue;
          const qty = typeof item.quantity === "number" ? item.quantity : 0;
          const unitSek =
            typeof item.unit_price_sek === "number" ? item.unit_price_sek : 0;
          totalByReservation[rid] = (totalByReservation[rid] ?? 0) + qty * unitSek;
          bottlesByReservation[rid] = (bottlesByReservation[rid] ?? 0) + qty;
        }
      } else if (shouldFallback) {
        const { data: itemsFallback, error: itemsFallbackError } = await sbAdmin
          .from("order_reservation_items")
          .select(
            `
            reservation_id,
            quantity,
            wines ( base_price_cents )
          `,
          )
          .in("reservation_id", reservationIds);

        if (itemsFallbackError) {
          console.error(
            "❌ [Reservations API] Error fetching reservation items (fallback):",
            itemsFallbackError,
          );
        } else if (Array.isArray(itemsFallback)) {
          for (const item of itemsFallback as ItemRowFallback[]) {
            const rid = item.reservation_id;
            if (typeof rid !== "string" || rid.length === 0) continue;
            const qty = typeof item.quantity === "number" ? item.quantity : 0;
            const baseCents =
              typeof item.wines?.base_price_cents === "number"
                ? item.wines.base_price_cents
                : 0;
            totalByReservation[rid] =
              (totalByReservation[rid] ?? 0) + qty * (baseCents / 100);
            bottlesByReservation[rid] = (bottlesByReservation[rid] ?? 0) + qty;
          }
        }
      } else if (itemsWithPriceError) {
        console.error(
          "❌ [Reservations API] Error fetching reservation items:",
          itemsWithPriceError,
        );
      }
    }

    // Manually fetch profiles for all user_ids
    const userIds = Array.from(
      new Set(
        baseReservations
          .map((r) => (r && typeof r.user_id === "string" ? r.user_id : null))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    type ProfileRow = { id: string; email: string | null; full_name: string | null };
    const profilesById = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      console.log(
        `🔍 [Reservations API] Fetching profiles for ${userIds.length} unique users`,
      );
      const { data: profiles, error: profilesError } = await sbAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error(
          "❌ [Reservations API] Error fetching profiles:",
          profilesError,
        );
      } else {
        for (const p of profiles ?? []) {
          if (p && typeof p.id === "string") {
            profilesById.set(p.id, p as ProfileRow);
          }
        }
      }
    }

    type DeliveryJoin = { id: string; name: string | null } | null;
    type PalletJoin = { id: string; name: string | null } | null;
    type ShippingRegionJoin = { id: string; name: string | null } | null;

    const enriched = baseReservations.map((reservation) => {
      const rid = typeof reservation.id === "string" ? reservation.id : "";
      const uid = typeof reservation.user_id === "string" ? reservation.user_id : null;
      const delivery = (reservation as { delivery?: DeliveryJoin }).delivery ?? null;
      const pallet = (reservation as { pallet?: PalletJoin }).pallet ?? null;
      const shippingRegion =
        (reservation as { shipping_region?: ShippingRegionJoin }).shipping_region ??
        null;
      const profile = uid ? profilesById.get(uid) ?? null : null;

      return {
        ...reservation,
        profiles: profile
          ? { full_name: profile.full_name, email: profile.email }
          : null,
        delivery_zone_name: delivery?.name ?? null,
        shipping_region_name: shippingRegion?.name ?? null,
        total_bottles:
          rid && Object.prototype.hasOwnProperty.call(bottlesByReservation, rid)
            ? bottlesByReservation[rid] ?? null
            : null,
        total_sek:
          rid && Object.prototype.hasOwnProperty.call(totalByReservation, rid)
            ? totalByReservation[rid] ?? null
            : null,
      };
    });

    console.log(
      `✅ [Reservations API] Returning ${enriched.length} reservations (enriched)`,
    );

    return NextResponse.json({ reservations: enriched });
  } catch (error) {
    console.error("❌ [Reservations API] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { reservationIds } = await request.json();

    if (
      !reservationIds ||
      !Array.isArray(reservationIds) ||
      reservationIds.length === 0
    ) {
      return NextResponse.json(
        { error: "No reservation IDs provided" },
        { status: 400 },
      );
    }

    console.log("DELETE request received for reservations:", reservationIds);

    const sb = getSupabaseAdmin();

    // Count reservations before deletion
    const { count: beforeCount } = await sb
      .from("order_reservations")
      .select("*", { count: "exact", head: true });

    console.log("Reservations before deletion:", beforeCount);

    // Delete reservation items first (foreign key constraint)
    console.log("Deleting reservation items...");
    const { error: itemsError } = await sb
      .from("order_reservation_items")
      .delete()
      .in("reservation_id", reservationIds);

    if (itemsError) {
      console.error("Error deleting reservation items:", itemsError);
      return NextResponse.json(
        { error: "Failed to delete reservation items" },
        { status: 500 },
      );
    }

    console.log("Reservation items deleted");

    // Delete reservations
    console.log("Deleting reservations...");
    const { error: reservationsError } = await sb
      .from("order_reservations")
      .delete()
      .in("id", reservationIds);

    if (reservationsError) {
      console.error("Error deleting reservations:", reservationsError);
      return NextResponse.json(
        { error: "Failed to delete reservations" },
        { status: 500 },
      );
    }

    console.log("Reservations deleted");

    // Count reservations after deletion
    const { count: afterCount } = await sb
      .from("order_reservations")
      .select("*", { count: "exact", head: true });

    console.log("Reservations after deletion:", afterCount);

    const deletedCount = (beforeCount || 0) - (afterCount || 0);

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} reservation(s)`,
      deletedCount: deletedCount,
      remainingCount: afterCount,
    });
  } catch (error) {
    console.error("Error in delete reservations API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
