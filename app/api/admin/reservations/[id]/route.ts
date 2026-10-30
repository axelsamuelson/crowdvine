import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isUnauthorizedResponse, requireAdminOr401 } from "@/lib/admin-auth-http";
import { z } from "zod";
import {
  cleanupEmptyPalletsAfterReservationChange,
  releaseBookingsForReservationPallet,
  updatePickupProducerForPallet,
} from "@/lib/pallet-auto-management";
import { rescalePrePalletContributionCents } from "@/lib/pallet-contribution";

const reservationItemUpdateSchema = z
  .object({
    id: z.string().nullable(),
    item_id: z.string(),
    quantity: z.number().finite(),
  })
  .strict();

/** Fields the admin reservation form actually submits. */
const reservationUpdateSchema = z
  .object({
    status: z.string(),
    order_id: z.string(),
    notes: z.string(),
    pickup_zone_id: z.string(),
    delivery_zone_id: z.string(),
    address_id: z.string(),
    delivery_address: z.string(),
    pallet_id: z.string(),
    items: z.array(reservationItemUpdateSchema).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = getSupabaseAdmin();

    const parsed = reservationUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reservation update" },
        { status: 400 },
      );
    }
    const { items, ...reservationData } = parsed.data;

    console.log("Updating reservation:", id, "with data:", reservationData);

    const { data: existingSnap, error: snapErr } = await supabase
      .from("order_reservations")
      .select("pallet_id, delivery_zone_id, shipping_region_id, status")
      .eq("id", id)
      .maybeSingle();

    if (snapErr || !existingSnap) {
      console.error("Reservation snapshot error:", snapErr);
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    const nextStatusRaw = reservationData.status;
    const nextStatus =
      typeof nextStatusRaw === "string" ? nextStatusRaw.toLowerCase() : "";
    if (nextStatus === "archived") {
      return NextResponse.json(
        {
          error:
            "Use POST /api/admin/reservations/:id/archive to soft-archive (sets archived_at + status_before_archive).",
        },
        { status: 400 },
      );
    }
    const terminalAdminStatuses = new Set(["cancelled", "rejected", "declined"]);
    const clearingPallet = terminalAdminStatuses.has(nextStatus);

    const cleanupSnapshot = {
      pallet_id: (existingSnap.pallet_id as string | null) ?? null,
      delivery_zone_id: (existingSnap.delivery_zone_id as string | null) ?? null,
      shipping_region_id:
        (existingSnap.shipping_region_id as string | null) ?? null,
    };

    if (clearingPallet && cleanupSnapshot.pallet_id) {
      await releaseBookingsForReservationPallet(id, cleanupSnapshot.pallet_id);
    }

    const { data: updatedReservation, error: reservationError } = await supabase
      .from("order_reservations")
      .update({
        ...reservationData,
        ...(clearingPallet ? { pallet_id: null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (reservationError) {
      console.error("Error updating reservation:", reservationError);
      return NextResponse.json(
        { error: "Failed to update reservation" },
        { status: 500 },
      );
    }

    if (clearingPallet) {
      await cleanupEmptyPalletsAfterReservationChange(cleanupSnapshot);
    }

    if (clearingPallet && cleanupSnapshot.pallet_id) {
      await updatePickupProducerForPallet(cleanupSnapshot.pallet_id);
      try {
        const { syncPalletShipReadiness } = await import(
          "@/lib/pallet-completion"
        );
        await syncPalletShipReadiness(cleanupSnapshot.pallet_id);
      } catch (e) {
        console.error(
          "[Admin] syncPalletShipReadiness after cancel:",
          e,
        );
      }
    }

    // Update reservation items
    if (items && Array.isArray(items)) {
      // First, get existing items
      const { data: existingItems } = await supabase
        .from("order_reservation_items")
        .select("id, economics_snapshot, quantity")
        .eq("reservation_id", id);

      const existingById = new Map(
        (existingItems ?? []).map((row) => [row.id as string, row]),
      );
      const existingItemIds = [...existingById.keys()];

      // Process each item
      for (const item of items) {
        if (item.id && existingItemIds.includes(item.id)) {
          const existing = existingById.get(item.id);
          const nextQty = Math.max(0, Math.floor(Number(item.quantity) || 0));
          const rescaled = rescalePrePalletContributionCents(
            existing?.economics_snapshot,
            nextQty,
          );
          const { error: updateError } = await supabase
            .from("order_reservation_items")
            .update({
              item_id: item.item_id,
              quantity: nextQty,
              ...(rescaled != null
                ? { pre_pallet_contribution_cents: rescaled }
                : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id);

          if (updateError) {
            console.error("Error updating reservation item:", updateError);
          }
        } else if (item.item_id) {
          // Create new item (no economics snapshot — admin manual add; shadow incomplete)
          const { error: insertError } = await supabase
            .from("order_reservation_items")
            .insert({
              reservation_id: id,
              item_id: item.item_id,
              quantity: item.quantity,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("Error creating reservation item:", insertError);
          }
        }
      }

      // Remove items that are no longer in the list
      const newItemIds = items
        .filter((item) => item.id && existingItemIds.includes(item.id))
        .map((item) => item.id);

      const itemsToDelete = existingItemIds.filter(
        (id) => !newItemIds.includes(id),
      );

      if (itemsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("order_reservation_items")
          .delete()
          .in("id", itemsToDelete);

        if (deleteError) {
          console.error("Error deleting reservation items:", deleteError);
        }
      }

      // Quantity edits change fill — resync readiness before shipping_ordered.
      const palletForSync =
        (updatedReservation?.pallet_id as string | null | undefined) ??
        cleanupSnapshot.pallet_id;
      if (palletForSync && !clearingPallet) {
        try {
          const { syncPalletShipReadiness } = await import(
            "@/lib/pallet-completion"
          );
          await syncPalletShipReadiness(palletForSync);
        } catch (e) {
          console.error(
            "[Admin] syncPalletShipReadiness after quantity edit:",
            e,
          );
        }
      }
    }

    // Return the updated reservation with items
    const { data: finalReservation } = await supabase
      .from("order_reservations")
      .select(
        `
        *,
        order_reservation_items(
          *,
          wines(
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            label_image_path
          )
        )
      `,
      )
      .eq("id", id)
      .single();

    return NextResponse.json({
      success: true,
      reservation: finalReservation,
    });
  } catch (error) {
    console.error("Reservation update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminAuth = await requireAdminOr401();
    if (isUnauthorizedResponse(adminAuth)) return adminAuth;
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const supabase = getSupabaseAdmin();

    // First try to find by order_id, then by id as fallback
    const { data: reservation, error } = await supabase
      .from("order_reservations")
      .select(
        `
        *,
        order_reservation_items(
          *,
          wines(
            id,
            wine_name,
            vintage,
            grape_varieties,
            color,
            base_price_cents,
            label_image_path,
            producers(
              name,
              region,
              country_code
            )
          )
        ),
        user_addresses(
          address_street,
          address_city,
          address_postcode,
          country_code
        ),
        profiles!inner(
          email,
          first_name,
          last_name,
          full_name
        )
      `,
      )
      .eq("order_id", id)
      .single();

    if (error && error.code === "PGRST116") {
      // Not found by order_id, try by id instead
      const { data: reservationById, error: errorById } = await supabase
        .from("order_reservations")
        .select(
          `
          *,
          order_reservation_items(
            *,
            wines(
              id,
              wine_name,
              vintage,
              grape_varieties,
              color,
                      base_price_cents,
              label_image_path,
              producers(
                name,
                region,
                country_code
              )
            )
          ),
          user_addresses(
            address_street,
            address_city,
            address_postcode,
            country_code
          ),
          profiles!inner(
            email,
            first_name,
            last_name,
            full_name
          )
        `,
        )
        .eq("id", id)
        .single();

      if (errorById || !reservationById) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ reservation: reservationById });
    }

    if (error || !reservation) {
      return NextResponse.json(
        { error: "Reservation not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error("Reservation fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
