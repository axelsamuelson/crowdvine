import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { computeSharedPalletChargeDeadlineIso } from "@/lib/checkout/shared-pallet-deadline";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import {
  confirmationChargedLineTotalsSek,
  confirmationDisplayTotalSek,
  confirmationOrderTypeFromFulfillment,
  isCustomerFacingLabel,
} from "@/lib/reservations/confirmation-display-total";
import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";
import { resolveWineImageSrc } from "@/lib/cart/wine-image-url";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) {
      console.warn("[GET /api/user/reservations/:id] unauthenticated", {
        reservationId: id,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    console.log("[GET /api/user/reservations/:id] start", {
      reservationId: id,
      userId: user.id,
    });

    // Get specific reservation with related data.
    // Avoid selecting columns that older/preview/prod DBs may lack (e.g.
    // order_type from migration 076, fulfillment_channel from migration 277).
    // Missing columns make PostgREST fail the whole GET and the confirmation
    // page shows http_500. Migration 277 is not applied in production — do not
    // select fulfillment_channel (treat as null / shared_pallet default).
    // Same schema-compat approach as the Stripe webhook base select.
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
        payment_method_type,
        payment_mode,
        total_sek,
        discount_amount_sek,
        shipping_revenue_gross_cents,
        pallet:pallets(name, cost_cents, bottle_capacity, created_at),
        order_reservation_items(
          item_id,
          quantity,
          wines(
            wine_name,
            vintage,
            base_price_cents,
            handle,
            label_image_path,
            producers(name, display_name)
          )
        )
      `,
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("[GET /api/user/reservations/:id] query error:", error);
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
      console.warn("[GET /api/user/reservations/:id] not found or wrong user", {
        reservationId: id,
        userId: user.id,
      });
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

    // Get user profile information for email + guest-checkout claim state
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "full_name, email, guest_checkout_at, account_claimed_at",
      )
      .eq("id", user.id)
      .maybeSingle();

    // Batch-load wines by item_id — same source as GET /api/user/reservations
    // (Mina köp). Nested wines joins can omit label_image_path on Preview.
    type WineRow = {
      id: string;
      wine_name?: string | null;
      vintage?: string | null;
      base_price_cents?: number | null;
      handle?: string | null;
      label_image_path?: string | null;
      producers?:
        | { name?: string | null; display_name?: string | null }
        | Array<{ name?: string | null; display_name?: string | null }>
        | null;
    };
    const lineRows = (reservation.order_reservation_items || []) as Array<{
      item_id?: string;
      quantity?: number;
      wines?: WineRow | WineRow[] | null;
    }>;
    const wineIds = Array.from(
      new Set(
        lineRows
          .map((it) => String(it.item_id || "").trim())
          .filter((id) => id.length > 0),
      ),
    );
    const wineById = new Map<string, WineRow>();
    if (wineIds.length > 0) {
      const { data: wines, error: winesError } = await supabase
        .from("wines")
        .select(
          "id, wine_name, vintage, base_price_cents, handle, label_image_path, producers(name, display_name)",
        )
        .in("id", wineIds);
      if (winesError) {
        console.error(
          "[GET /api/user/reservations/:id] wines batch error:",
          winesError,
        );
      } else {
        for (const w of (wines || []) as WineRow[]) {
          if (w?.id) wineById.set(String(w.id), w);
        }
      }
    }

    const rawItems = lineRows.map((item) => {
      const wineId = String(item.item_id || "").trim();
      const nested = Array.isArray(item.wines) ? item.wines[0] : item.wines;
      const wine = (wineId && wineById.get(wineId)) || nested || null;
      const producerRaw = wine?.producers;
      const producer = Array.isArray(producerRaw)
        ? producerRaw[0]
        : producerRaw;
      const labelPath =
        typeof wine?.label_image_path === "string"
          ? wine.label_image_path
          : null;
      const resolvedImage = resolveWineImageSrc(labelPath);
      return {
        wine_name: wine?.wine_name || "Wine",
        quantity: item.quantity,
        vintage: wine?.vintage || "",
        price_cents: wine?.base_price_cents || 0,
        label_image_path: labelPath,
        // Same resolver + path as Mina köp list (`image_path`).
        image_url:
          resolvedImage === DEFAULT_WINE_IMAGE_PATH && !labelPath?.trim()
            ? undefined
            : resolvedImage === DEFAULT_WINE_IMAGE_PATH
              ? undefined
              : resolvedImage,
        product_handle: wine?.handle || undefined,
        producer_name: producer?.name || undefined,
        producer_display_name: producer?.display_name?.trim() || undefined,
        customer_email: profile?.email || user.email,
        customer_name: profile?.full_name || undefined,
        // Without migration 277, channel is absent → shared_pallet / producer.
        source: "producer" as const,
      };
    });

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
        wine:wines(id, wine_name, vintage, base_price_cents, handle, label_image_path, producers(name, display_name))
      `,
      )
      .eq("reservation_id", reservation.id)
      .eq("from_user_id", user.id);

    if (sharedError) {
      // Non-fatal: reservation details should still load if share query fails.
      console.error(
        "[GET /api/user/reservations/:id] share allocations error (continuing without shared section):",
        sharedError,
      );
    }

    if (!sharedError && sharedRows && sharedRows.length > 0) {
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
          producer_display_name:
            wineRow.producers?.display_name?.trim() || undefined,
          product_handle: wineRow.handle || undefined,
          image_url: (() => {
            const raw = wineRow.label_image_path || null;
            const resolved = resolveWineImageSrc(raw);
            return resolved === DEFAULT_WINE_IMAGE_PATH && !raw?.trim()
              ? undefined
              : resolved === DEFAULT_WINE_IMAGE_PATH
                ? undefined
                : resolved;
          })(),
          label_image_path: wineRow.label_image_path || null,
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

    const wineSubtotalCents = rawItems.reduce(
      (sum, item) => sum + (item.price_cents || 0) * (item.quantity || 0),
      0,
    );

    const shippingCostCents = Math.max(
      0,
      Math.round(Number(reservation.shipping_revenue_gross_cents) || 0),
    );
    const storedTotalSek =
      reservation.total_sek != null && Number.isFinite(Number(reservation.total_sek))
        ? Number(reservation.total_sek)
        : null;
    const discountAmountSek = Math.max(
      0,
      Number(reservation.discount_amount_sek) || 0,
    );
    const wineTotalSek =
      storedTotalSek != null
        ? Math.round(storedTotalSek)
        : Math.round(wineSubtotalCents / 100);
    // Customer-facing charge total = wine + shipping (matches checkout CTA).
    const displayTotalSek = confirmationDisplayTotalSek({
      totalSek: storedTotalSek,
      shippingRevenueGrossCents: shippingCostCents,
      wineSubtotalCentsFallback: wineSubtotalCents,
    });
    const totalAmountCents = Math.round(displayTotalSek * 100);
    const subtotalSek = wineTotalSek + discountAmountSek;
    const shippingSek = Math.round(shippingCostCents / 100);

    // Charged line totals (integer kronor) so lines + shipping === display total.
    const chargedLineSek = confirmationChargedLineTotalsSek({
      lines: rawItems.map((item) => ({
        quantity: item.quantity,
        listUnitOre: item.price_cents,
      })),
      winesTotalSek: wineTotalSek,
    });
    const items = rawItems.map((item, index) => {
      const lineTotalSek = chargedLineSek[index] ?? 0;
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      const unitSek =
        qty > 0
          ? Math.round(lineTotalSek / qty)
          : b2cWholeKronorFromOre(item.price_cents);
      return {
        ...item,
        /** Charged line total in whole kronor (post-discount allocation). */
        line_total_sek: lineTotalSek,
        /** Charged unit kronor for display; öre kept for legacy clients. */
        price_cents: unitSek * 100,
      };
    });

    // Detect shared pallet via pallet_id (fulfillment_channel may be null on older rows).
    const palletCreatedAt =
      reservation.pallet &&
      typeof (reservation.pallet as { created_at?: unknown }).created_at ===
        "string"
        ? (reservation.pallet as { created_at: string }).created_at
        : null;
    const chargeDeadlineAt = isPalletBasedReservation({
      pallet_id: reservation.pallet_id,
    })
      ? computeSharedPalletChargeDeadlineIso(palletCreatedAt)
      : null;

    // Migration 277 not selected — shared_pallet default for confirmation.
    const fulfillmentChannel: string | null = null;
    const orderType = confirmationOrderTypeFromFulfillment(fulfillmentChannel);

    // Claim row in email_sends means confirmation was queued/sent (idempotent claim-before-send).
    const { data: confirmationEmailRow } = await supabase
      .from("email_sends")
      .select("id")
      .eq("reservation_id", reservation.id)
      .eq("email_type", "order_confirmation")
      .limit(1)
      .maybeSingle();
    const confirmationEmailSent = Boolean(confirmationEmailRow?.id);

    // Transform the data to match the expected format
    const palletNameRaw =
      typeof reservation.pallet?.name === "string"
        ? reservation.pallet.name
        : null;
    const transformedReservation = {
      id: reservation.id,
      // order_reservations.order_id does not exist in DB; use reservation id as a stable display id
      order_id: reservation.id,
      status: reservation.status,
      created_at: reservation.created_at,
      pallet_id: reservation.pallet_id,
      pallet_name: isCustomerFacingLabel(palletNameRaw) ? palletNameRaw : null,
      pallet_cost_cents: reservation.pallet?.cost_cents || 0,
      pallet_capacity: reservation.pallet?.bottle_capacity || 0,
      /** Shared-pallet charge/close deadline (created_at + 28d). Null for direct. */
      charge_deadline_at: chargeDeadlineAt,
      // Never send "Unknown …" stubs; omit pickup for home-delivery (null zone).
      pickup_zone: isCustomerFacingLabel(pickupZoneName)
        ? pickupZoneName
        : null,
      delivery_zone: isCustomerFacingLabel(deliveryZoneName)
        ? deliveryZoneName
        : null,
      delivery_address: deliveryAddress,
      /** Charged total wine + shipping in SEK (matches checkout CTA). */
      total_sek: displayTotalSek,
      /** Wine-only charged total before shipping. */
      wines_total_sek: wineTotalSek,
      discount_amount_sek: discountAmountSek,
      subtotal_sek: subtotalSek,
      total_amount_cents: totalAmountCents,
      shipping_cost_cents: shippingCostCents,
      shipping_sek: shippingSek,
      customer_email: profile?.email || user.email,
      customer_name: profile?.full_name || null,
      /** Unclaimed guest checkout identity — show optional account offer. */
      is_guest_checkout: Boolean(
        profile?.guest_checkout_at && !profile?.account_claimed_at,
      ),
      order_type: orderType,
      fulfillment_channel: fulfillmentChannel,
      payment_method_type: reservation.payment_method_type || "card",
      /** True when order_confirmation was claimed in email_sends (queued/sent). */
      confirmation_email_sent: confirmationEmailSent,
      /**
       * Home-delivery shared pallet never exposes a pickup zone (customer
       * does not pick up). Warehouse/direct may still surface one when set.
       */
      show_pickup_zone:
        fulfillmentChannel === "warehouse" ||
        fulfillmentChannel === "direct_box",
      items,
      shared,
    };

    console.log("[GET /api/user/reservations/:id] ok", {
      reservationId: reservation.id,
      userId: user.id,
      itemCount: items.length,
    });

    return NextResponse.json(transformedReservation);
  } catch (error) {
    console.error("Reservation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
