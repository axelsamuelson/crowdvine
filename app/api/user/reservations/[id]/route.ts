import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Get specific reservation with related data
    const { data: reservation, error } = await supabase
      .from("order_reservations")
      .select(
        `
        id,
        status,
        created_at,
        pallet_id,
        pickup_zone_id,
        delivery_zone_id,
        address_id,
        user_id,
        order_type,
        payment_method_type,
        pallet:pallets(name, cost_cents, bottle_capacity),
        order_reservation_items(
          item_id,
          quantity,
          wines(
            wine_name,
            vintage,
            base_price_cents,
            handle,
            label_image_path,
            producers(name)
          )
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching reservation:", error);
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        isProd
          ? { error: "Failed to fetch reservation" }
          : {
              error: "Failed to fetch reservation",
              debug: {
                message: (error as any)?.message,
                code: (error as any)?.code,
                details: (error as any)?.details,
                hint: (error as any)?.hint,
              },
            },
        { status: 500 },
      );
    }

    if (!reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    // Fetch pickup/delivery zone names in a second query to avoid joining pallet_zones twice
    const zoneIds = [reservation.pickup_zone_id, reservation.delivery_zone_id]
      .filter(Boolean) as string[];
    let pickupZoneName: string | null = null;
    let deliveryZoneName: string | null = null;
    if (zoneIds.length > 0) {
      const { data: zones, error: zonesError } = await supabase
        .from("pallet_zones")
        .select("id, name")
        .in("id", zoneIds);
      if (!zonesError && zones) {
        const byId = new Map(zones.map((z) => [z.id, z.name]));
        pickupZoneName = reservation.pickup_zone_id
          ? byId.get(reservation.pickup_zone_id) || null
          : null;
        deliveryZoneName = reservation.delivery_zone_id
          ? byId.get(reservation.delivery_zone_id) || null
          : null;
      }
    }

    // Fetch delivery address from user_addresses (order_reservations stores address_id)
    let deliveryAddress: string | null = null;
    if (reservation.address_id) {
      const { data: addr, error: addrError } = await supabase
        .from("user_addresses")
        .select("address_street, address_city, address_postcode, country_code")
        .eq("id", reservation.address_id)
        .single();
      if (!addrError && addr) {
        const parts = [
          addr.address_street,
          `${addr.address_postcode || ""} ${addr.address_city || ""}`.trim(),
          addr.country_code,
        ].filter(Boolean);
        deliveryAddress = parts.join(", ");
      }
    }

    // Get user profile information for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const items =
      reservation.order_reservation_items?.map((item) => ({
        wine_name: item.wines?.wine_name || "Unknown Wine",
        quantity: item.quantity,
        vintage: item.wines?.vintage || "N/A",
        price_cents: item.wines?.base_price_cents || 0,
        image_url: item.wines?.label_image_path || undefined,
        product_handle: item.wines?.handle || undefined,
        producer_name: item.wines?.producers?.name || undefined,
        customer_email: profile?.email || user.email,
        customer_name: profile?.full_name || "Valued Customer",
        source: reservation.order_type === "warehouse" ? "warehouse" : "producer",
      })) || [];

    // Fetch shared bottle allocations (optional)
    let shared:
      | Array<{
          to_user: { id: string; full_name?: string; avatar_image_path?: string };
          total_cents: number;
          items: Array<{
            wine_id: string;
            wine_name: string;
            vintage: string;
            producer_name?: string;
            product_handle?: string;
            image_url?: string;
            quantity: number;
            price_cents: number;
          }>;
        }>
      | null = null;

    const { data: sharedRows, error: sharedError } = await supabase
      .from("reservation_shared_items")
      .select(
        `
        to_user_id,
        quantity,
        wine_id,
        to_profile:profiles!to_user_id(id, full_name, avatar_image_path),
        wine:wines(id, wine_name, vintage, base_price_cents, handle, label_image_path, producers(name))
      `,
      )
      .eq("reservation_id", reservation.id)
      .eq("from_user_id", user.id);

    if (sharedError) {
      console.error("Error fetching reservation share allocations:", sharedError);
      const isProd = process.env.NODE_ENV === "production";
      return NextResponse.json(
        isProd
          ? { error: "Failed to fetch reservation" }
          : {
              error: "Failed to fetch reservation",
              debug: {
                message: (sharedError as any)?.message,
                code: (sharedError as any)?.code,
                details: (sharedError as any)?.details,
                hint: (sharedError as any)?.hint,
              },
            },
        { status: 500 },
      );
    }

    if (sharedRows && sharedRows.length > 0) {
      const byTo = new Map<
        string,
        {
          to_user: { id: string; full_name?: string; avatar_image_path?: string };
          total_cents: number;
          items: Array<{
            wine_id: string;
            wine_name: string;
            vintage: string;
            producer_name?: string;
            product_handle?: string;
            image_url?: string;
            quantity: number;
            price_cents: number;
          }>;
        }
      >();

      for (const row of sharedRows as any[]) {
        const toId = String(row.to_user_id);
        const profileRow = row.to_profile || {};
        const wineRow = row.wine || {};
        const priceCents = Number(wineRow.base_price_cents) || 0;
        const qty = Number(row.quantity) || 0;

        const entry =
          byTo.get(toId) ||
          ({
            to_user: {
              id: toId,
              full_name: profileRow.full_name || undefined,
              avatar_image_path: profileRow.avatar_image_path || undefined,
            },
            total_cents: 0,
            items: [],
          } as const);

        const item = {
          wine_id: String(row.wine_id),
          wine_name: wineRow.wine_name || "Unknown Wine",
          vintage: wineRow.vintage || "N/A",
          producer_name: wineRow.producers?.name || undefined,
          product_handle: wineRow.handle || undefined,
          image_url: wineRow.label_image_path || undefined,
          quantity: qty,
          price_cents: priceCents,
        };

        // Merge same wine entries per recipient
        const existing = entry.items.find((i) => i.wine_id === item.wine_id);
        if (existing) {
          existing.quantity += qty;
        } else {
          entry.items.push(item);
        }
        entry.total_cents += priceCents * qty;

        byTo.set(toId, entry);
      }

      shared = Array.from(byTo.values());
    } else {
      shared = [];
    }

    const wineSubtotalCents = items.reduce(
      (sum, item) => sum + (item.price_cents || 0) * (item.quantity || 0),
      0,
    );

    const shippingCostCents = 0;
    const totalAmountCents = wineSubtotalCents + shippingCostCents;

    // Transform the data to match the expected format
    const transformedReservation = {
      id: reservation.id,
      // order_reservations.order_id does not exist in DB; use reservation id as a stable display id
      order_id: reservation.id,
      status: reservation.status,
      created_at: reservation.created_at,
      pallet_id: reservation.pallet_id,
      pallet_name: reservation.pallet?.name || "Unknown Pallet",
      pallet_cost_cents: reservation.pallet?.cost_cents || 0,
      pallet_capacity: reservation.pallet?.bottle_capacity || 0,
      pickup_zone: pickupZoneName || "Unknown Pickup Zone",
      delivery_zone: deliveryZoneName || "Unknown Delivery Zone",
      delivery_address: deliveryAddress,
      total_amount_cents: totalAmountCents,
      shipping_cost_cents: shippingCostCents,
      customer_email: profile?.email || user.email,
      customer_name: profile?.full_name || "Valued Customer",
      order_type: reservation.order_type || "producer",
      payment_method_type: reservation.payment_method_type || "card",
      items,
      shared,
    };

    return NextResponse.json(transformedReservation);
  } catch (error) {
    console.error("Reservation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
