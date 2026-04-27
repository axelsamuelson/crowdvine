// NOTE: The bookings table is deprecated as a data source.
// This endpoint now reads from order_reservation_items
// which is the single source of truth for pallet fill counts.
// The bookings table still exists but is no longer written to
// (checkout/confirm insert was disabled in a previous phase).
// TODO (Fas D): Drop the bookings table entirely after
// verifying no remaining reads depend on it.

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ProfileLite = {
  full_name: string | null;
  email: string | null;
};

type AdminBookingWine = {
  id: string;
  wine_name: string;
  vintage: string;
  label_image_path: string | null;
  producer: { name: string };
  base_price_cents: number | null;
};

type AdminBookingPallet = {
  id: string;
  name: string;
};

export type AdminBookingRow = {
  id: string;
  reservation_id: string;
  user_id: string;
  item_id: string;
  quantity: number;
  band: string;
  status: string;
  pallet_id: string | null;
  created_at: string;
  wine: AdminBookingWine | null;
  pallet: AdminBookingPallet | null;
  profile: ProfileLite | null;
};

export type AdminReservationRow = {
  id: string;
  user_id: string;
  status: string;
  pallet_id: string | null;
  created_at: string;
  payment_status: string | null;
  fulfillment_status: string | null;
  cart_id: string | null;
  profile: ProfileLite | null;
};

type NestedReservation = {
  id: string;
  user_id: string;
  status: string;
  pallet_id: string | null;
  created_at: string;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  cart_id?: string | null;
};

type NestedProducer = { name: string | null } | null;

type NestedWine = {
  id: string;
  wine_name: string | null;
  vintage: string | null;
  label_image_path: string | null;
  base_price_cents: number | null;
  producers: NestedProducer | NestedProducer[] | null;
};

type RawReservationItem = {
  id: string;
  reservation_id: string;
  item_id: string;
  quantity: number | string | null;
  price_band: string | null;
  created_at: string;
  order_reservations: NestedReservation | NestedReservation[] | null;
  wines: NestedWine | NestedWine[] | null;
};

function singleOrNull<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function parseWine(raw: NestedWine | NestedWine[] | null): AdminBookingWine | null {
  const w = singleOrNull(raw);
  if (!w?.id) return null;
  const prod = singleOrNull(w.producers ?? null);
  const name = prod?.name?.trim() || "";
  return {
    id: w.id,
    wine_name: String(w.wine_name ?? ""),
    vintage: String(w.vintage ?? ""),
    label_image_path:
      typeof w.label_image_path === "string" ? w.label_image_path : null,
    producer: { name: name },
    base_price_cents:
      typeof w.base_price_cents === "number" ? w.base_price_cents : null,
  };
}

export async function GET() {
  try {
    const sb = getSupabaseAdmin();

    const { data: rawItems, error: itemsError } = await sb
      .from("order_reservation_items")
      .select(
        `
        id,
        reservation_id,
        item_id,
        quantity,
        price_band,
        created_at,
        order_reservations!inner (
          id,
          user_id,
          status,
          pallet_id,
          created_at,
          payment_status,
          fulfillment_status,
          cart_id
        ),
        wines (
          id,
          wine_name,
          vintage,
          label_image_path,
          base_price_cents,
          producers ( name )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (itemsError) {
      console.error("❌ [Bookings API] order_reservation_items:", itemsError);
      return NextResponse.json({
        bookings: [],
        reservations: [],
        error: itemsError.message,
      });
    }

    const items = (rawItems ?? []) as RawReservationItem[];

    const userIds = [
      ...new Set(
        items
          .map((row) => singleOrNull(row.order_reservations)?.user_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];

    const palletIds = [
      ...new Set(
        items
          .map((row) => singleOrNull(row.order_reservations)?.pallet_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];

    const profilesMap = new Map<string, ProfileLite>();
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await sb
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      if (profilesError) {
        console.error("❌ [Bookings API] profiles:", profilesError);
      } else {
        for (const p of profiles ?? []) {
          if (p?.id) {
            profilesMap.set(String(p.id), {
              full_name: p.full_name != null ? String(p.full_name) : null,
              email: p.email != null ? String(p.email) : null,
            });
          }
        }
      }
    }

    const palletsMap = new Map<string, AdminBookingPallet>();
    if (palletIds.length > 0) {
      const { data: pallets, error: palletsError } = await sb
        .from("pallets")
        .select("id, name")
        .in("id", palletIds);

      if (palletsError) {
        console.error("❌ [Bookings API] pallets:", palletsError);
      } else {
        for (const p of pallets ?? []) {
          if (p?.id) {
            palletsMap.set(String(p.id), {
              id: String(p.id),
              name: String(p.name ?? ""),
            });
          }
        }
      }
    }

    const reservationsMap = new Map<string, AdminReservationRow>();

    const bookings: AdminBookingRow[] = items.map((row) => {
      const res = singleOrNull(row.order_reservations);
      const uid = res?.user_id != null ? String(res.user_id) : "";
      const resId = res?.id != null ? String(res.id) : String(row.reservation_id);
      const profile = uid ? profilesMap.get(uid) ?? null : null;
      const palletId =
        res?.pallet_id != null && String(res.pallet_id).length > 0
          ? String(res.pallet_id)
          : null;
      const pallet = palletId ? palletsMap.get(palletId) ?? null : null;

      if (res && !reservationsMap.has(resId)) {
        reservationsMap.set(resId, {
          id: resId,
          user_id: uid,
          status: String(res.status ?? ""),
          pallet_id: palletId,
          created_at: String(res.created_at ?? ""),
          payment_status:
            res.payment_status != null ? String(res.payment_status) : null,
          fulfillment_status:
            res.fulfillment_status != null
              ? String(res.fulfillment_status)
              : null,
          cart_id: res.cart_id != null ? String(res.cart_id) : null,
          profile,
        });
      }

      const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
      const band = row.price_band != null ? String(row.price_band) : "";

      return {
        id: String(row.id),
        reservation_id: resId,
        user_id: uid,
        item_id: String(row.item_id),
        quantity: qty,
        band,
        status: String(res?.status ?? ""),
        pallet_id: palletId,
        created_at: String(row.created_at ?? ""),
        wine: parseWine(row.wines ?? null),
        pallet,
        profile,
      };
    });

    const reservations = [...reservationsMap.values()].sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return tb - ta;
    });

    return NextResponse.json({
      bookings,
      reservations,
    });
  } catch (error) {
    console.error("Error in bookings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { bookingIds } = (await request.json()) as {
      bookingIds?: unknown;
    };

    if (!bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { error: "No booking IDs provided" },
        { status: 400 },
      );
    }

    const ids = bookingIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );

    if (ids.length === 0) {
      return NextResponse.json(
        { error: "No valid reservation item IDs provided" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    const { error } = await sb
      .from("order_reservation_items")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("Error deleting order_reservation_items:", error);
      return NextResponse.json(
        { error: "Failed to delete reservation items" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${ids.length} reservation line(s)`,
    });
  } catch (error) {
    console.error("Error in delete bookings API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
