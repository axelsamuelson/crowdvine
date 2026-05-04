import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildReservationSummaryGroups } from "@/lib/reservations/user-reservations-api";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Get the current authenticated user
    const user = await getCurrentUser();

    if (!user) {
      console.log("No authenticated user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = user.id;
    console.log(`Fetching reservations for user: ${userId}`);

    // Get reservations with related data
    const { data: reservations, error } = await supabase
      .from("order_reservations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reservations:", error);
      return NextResponse.json(
        { error: "Failed to fetch reservations" },
        { status: 500 },
      );
    }

    console.log(
      `Found ${reservations?.length || 0} reservations for user ${userId}`,
    );

    // If no reservations, return empty array
    if (!reservations || reservations.length === 0) {
      return NextResponse.json({ reservations: [], summaryGroups: [] });
    }

    // ---- Data-driven pallet derivation (no manual fix needed) ----
    // We derive pickup_zone_id from the wines in each reservation -> producers.pickup_zone_id.
    // Then we match pallet by (derivedPickupZoneId, reservation.delivery_zone_id).
    const reservationIds = reservations.map((r) => r.id);

    // Load all reservation items for these reservations
    const { data: reservationItems, error: reservationItemsError } =
      await supabase
        .from("order_reservation_items")
        .select("reservation_id, item_id, quantity")
        .in("reservation_id", reservationIds);

    if (reservationItemsError) {
      console.error("Error fetching reservation items:", reservationItemsError);
      return NextResponse.json(
        { error: "Failed to fetch reservation items" },
        { status: 500 },
      );
    }

    const wineIds = Array.from(
      new Set((reservationItems || []).map((i: any) => i.item_id)),
    );

    // Fetch wine -> producer_id mapping
    const wineProducerByWineId = new Map<string, string>();
    if (wineIds.length > 0) {
      const { data: wines, error: winesError } = await supabase
        .from("wines")
        .select("id, producer_id")
        .in("id", wineIds);

      if (winesError) {
        console.error("Error fetching wines for reservations:", winesError);
        return NextResponse.json(
          { error: "Failed to fetch wines" },
          { status: 500 },
        );
      }

      (wines || []).forEach((w: any) => {
        if (w?.id && w?.producer_id) wineProducerByWineId.set(w.id, w.producer_id);
      });
    }

    const producerIds = Array.from(new Set(Array.from(wineProducerByWineId.values())));

    // Fetch producer -> pickup_zone_id mapping
    const pickupZoneByProducerId = new Map<string, string | null>();
    if (producerIds.length > 0) {
      const { data: producers, error: producersError } = await supabase
        .from("producers")
        .select("id, pickup_zone_id")
        .in("id", producerIds);

      if (producersError) {
        console.error("Error fetching producers for reservations:", producersError);
        return NextResponse.json(
          { error: "Failed to fetch producers" },
          { status: 500 },
        );
      }

      (producers || []).forEach((p: any) =>
        pickupZoneByProducerId.set(p.id, p.pickup_zone_id || null),
      );
    }

    // Build reservation -> derivedPickupZoneId (or null)
    const derivedPickupZoneByReservationId = new Map<string, string | null>();
    for (const r of reservations) {
      const pickupZones = new Set<string>();
      (reservationItems || [])
        .filter((it: any) => it.reservation_id === r.id)
        .forEach((it: any) => {
          const producerId = wineProducerByWineId.get(it.item_id);
          if (!producerId) return;
          const pz = pickupZoneByProducerId.get(producerId);
          if (pz) pickupZones.add(pz);
        });

      // If multiple pickup zones exist in a single reservation, keep null and show as unassigned-ish.
      derivedPickupZoneByReservationId.set(
        r.id,
        pickupZones.size === 1 ? Array.from(pickupZones)[0] : null,
      );
    }

    // Prefetch pallets for quick matching
    const allDerivedPickupZoneIds = Array.from(
      new Set(
        Array.from(derivedPickupZoneByReservationId.values()).filter(Boolean) as string[],
      ),
    );
    const deliveryZoneIds = Array.from(
      new Set(
        reservations.map((r) => r.delivery_zone_id).filter(Boolean) as string[],
      ),
    );

    const palletByKey = new Map<string, any>();
    if (allDerivedPickupZoneIds.length > 0 && deliveryZoneIds.length > 0) {
      const { data: pallets, error: palletsError } = await supabase
        .from("pallets")
        .select("id, name, bottle_capacity, is_complete, status, pickup_zone_id, delivery_zone_id")
        .in("pickup_zone_id", allDerivedPickupZoneIds)
        .in("delivery_zone_id", deliveryZoneIds);

      if (palletsError) {
        console.error("Error fetching pallets for reservations:", palletsError);
      } else {
        (pallets || []).forEach((p: any) => {
          const key = `${p.pickup_zone_id}|${p.delivery_zone_id}`;
          palletByKey.set(key, p);
        });
      }
    }

    const reservationRows = reservations as Array<Record<string, unknown>>;
    const marketDropById = new Map<string, Record<string, unknown>>();
    const mdIds = Array.from(
      new Set(
        reservationRows
          .map((r) => r.market_drop_id)
          .filter(
            (id): id is string =>
              typeof id === "string" && id.trim().length > 0,
          )
          .map((id) => id.trim()),
      ),
    );
    if (mdIds.length > 0) {
      const { data: mds, error: mdErr } = await supabase
        .from("market_drops")
        .select(
          "id, display_name, display_destination, checkout_mode, market_code, country_code, region_code, status, source_pallet_id, capacity_bottles, reserved_bottles",
        )
        .in("id", mdIds);
      if (!mdErr && mds) {
        (mds as Array<Record<string, unknown>>).forEach((row) => {
          const id = row.id != null ? String(row.id) : "";
          if (id) marketDropById.set(id, row);
        });
      }
    }

    const sourcePalletIds = Array.from(
      new Set(
        Array.from(marketDropById.values())
          .map((md) => md.source_pallet_id)
          .filter(
            (id): id is string =>
              typeof id === "string" && String(id).trim().length > 0,
          )
          .map((id) => String(id).trim()),
      ),
    );
    const sourcePalletNameById = new Map<string, string>();
    if (sourcePalletIds.length > 0) {
      const { data: spl } = await supabase
        .from("pallets")
        .select("id, name")
        .in("id", sourcePalletIds);
      (spl || []).forEach((p: { id?: string; name?: string }) => {
        if (p?.id) sourcePalletNameById.set(String(p.id), String(p.name ?? ""));
      });
    }

    // Transform the data to match the expected format
    const transformedReservations = await Promise.all(
      reservations.map(async (reservation) => {
        // Get pallet name and capacity based on zones
        let palletName = "Unassigned Pallet";
        let palletId = null;
        let palletCapacity = null;
        let palletIsComplete = false;
        let palletStatus = null;

        const derivedPickupZoneId =
          derivedPickupZoneByReservationId.get(reservation.id) || null;
        const deliveryZoneId = reservation.delivery_zone_id || null;
        if (derivedPickupZoneId && deliveryZoneId) {
          const key = `${derivedPickupZoneId}|${deliveryZoneId}`;
          const pallet = palletByKey.get(key);
          if (pallet) {
            palletName = pallet.name;
            palletId = pallet.id;
            palletCapacity = pallet.bottle_capacity;
            palletIsComplete = pallet.is_complete || false;
            palletStatus = pallet.status;
          }
        }

        // Get delivery address instead of zone names
        let deliveryAddress = "No delivery address";

        if (reservation.address_id) {
          const { data: address } = await supabase
            .from("user_addresses")
            .select(
              "address_street, address_city, address_postcode, country_code",
            )
            .eq("id", reservation.address_id)
            .single();

          if (address) {
            deliveryAddress = `${address.address_street}, ${address.address_postcode} ${address.address_city}, ${address.country_code}`;
          }
        }

        // Get reservation items with wine details and costs
        const { data: items, error: itemsError } = await supabase
          .from("order_reservation_items")
          .select(
            `
          id,
          item_id,
          quantity,
          producer_decision_status,
          producer_approved_quantity,
          wines(
            wine_name,
            vintage,
            label_image_path,
            grape_varieties,
            color,
            base_price_cents,
            handle,
            producers(name)
          )
        `,
          )
          .eq("reservation_id", reservation.id);

        if (itemsError) {
          console.error(`Error fetching items for reservation ${reservation.id}:`, itemsError);
          // Continue with empty items array if there's an error
        }

        // Calculate costs - handle gracefully if items is null or wines relation failed
        const itemsWithCosts =
          items?.map((item) => {
            // Handle case where wines relation might be null
            if (!item.wines) {
              return {
                wine_name: "Unknown Wine",
                quantity: item.quantity,
                producer_decision_status: item.producer_decision_status || null,
                producer_approved_quantity: null,
                vintage: "N/A",
                image_path: null,
                grape_varieties: null,
                color: null,
                handle: null,
                price_per_bottle_cents: 0,
                producer_name: null,
                total_cost_cents: 0,
              };
            }
            return {
              wine_name: item.wines?.wine_name || "Unknown Wine",
              quantity: item.quantity,
              producer_decision_status: item.producer_decision_status || null,
              producer_approved_quantity:
                item.producer_approved_quantity === null ||
                item.producer_approved_quantity === undefined
                  ? null
                  : Number(item.producer_approved_quantity) || 0,
              vintage: item.wines?.vintage || "N/A",
              image_path: item.wines?.label_image_path || null,
              grape_varieties: item.wines?.grape_varieties || null,
              color: item.wines?.color || null,
              handle: item.wines?.handle || null,
              price_per_bottle_cents: item.wines?.base_price_cents || 0,
              producer_name: item.wines?.producers?.name || null,
              total_cost_cents:
                (item.wines?.base_price_cents || 0) * item.quantity,
            };
          }) || [];

        const totalCostCents = itemsWithCosts.reduce(
          (sum, item) => sum + item.total_cost_cents,
          0,
        );

        const resRow = reservation as Record<string, unknown>;
        const mdIdRaw = resRow.market_drop_id;
        const mdId =
          typeof mdIdRaw === "string" && mdIdRaw.trim()
            ? mdIdRaw.trim()
            : null;
        const md = mdId ? marketDropById.get(mdId) : undefined;

        const bottleCount = itemsWithCosts.reduce(
          (sum, item) => sum + (Number(item.quantity) || 0),
          0,
        );

        const rawConditional = Boolean(resRow.is_conditional);
        const st = String(reservation.status || "");
        const mdCheckout = md
          ? String((md as { checkout_mode?: string }).checkout_mode || "")
          : "";
        const isConditional =
          rawConditional ||
          st === "conditional_pending" ||
          mdCheckout === "conditional_reservation";

        const bottleVerb = isConditional ? "requested" : "ordered";
        const displayDestination =
          md && typeof (md as { display_destination?: string }).display_destination === "string"
            ? String((md as { display_destination: string }).display_destination).trim() || null
            : null;
        const customerPalletLabel = displayDestination
          ? `${displayDestination} pallet`
          : "Your reservation";

        const mdSourceId =
          md && (md as { source_pallet_id?: unknown }).source_pallet_id != null
            ? String((md as { source_pallet_id: unknown }).source_pallet_id).trim()
            : null;
        const sourcePalletName =
          mdSourceId && mdSourceId.length > 0
            ? sourcePalletNameById.get(mdSourceId) ?? null
            : null;

        const mdCap =
          md && (md as { capacity_bottles?: unknown }).capacity_bottles != null
            ? Number((md as { capacity_bottles: unknown }).capacity_bottles)
            : null;
        const mdReserved =
          md && (md as { reserved_bottles?: unknown }).reserved_bottles != null
            ? Number((md as { reserved_bottles: unknown }).reserved_bottles)
            : null;

        const chargeBlockedReason =
          typeof resRow.charge_blocked_reason === "string"
            ? resRow.charge_blocked_reason
            : null;

        return {
          id: reservation.id,
          order_id: reservation.order_id || reservation.id,
          status: reservation.status,
          created_at: reservation.created_at,
          pallet_id: palletId,
          pallet_name: customerPalletLabel,
          pallet_capacity:
            mdCap != null && Number.isFinite(mdCap) && mdCap > 0
              ? mdCap
              : palletCapacity,
          pallet_is_complete: palletIsComplete,
          pallet_status: palletStatus,
          delivery_address: deliveryAddress,
          total_cost_cents: totalCostCents,
          items: itemsWithCosts,
          payment_status: reservation.payment_status,
          payment_link: reservation.payment_link,
          payment_deadline: reservation.payment_deadline,
          market_drop_id: mdId,
          marketDropId: mdId,
          geoZoneId: null,
          displayDestination,
          marketCode:
            md && (md as { market_code?: string }).market_code
              ? String((md as { market_code: string }).market_code)
              : null,
          countryCode:
            md && (md as { country_code?: string }).country_code
              ? String((md as { country_code: string }).country_code)
              : null,
          regionCode:
            md && (md as { region_code?: string | null }).region_code != null
              ? String((md as { region_code: string | null }).region_code || "")
              : null,
          checkoutMode: mdCheckout || null,
          reservationModeLabel: isConditional ? "Conditional reservation" : "",
          bottleCount,
          bottleVerb,
          customerPalletLabel,
          isConditional,
          chargeBlockedReason,
          marketDropReservedBottles:
            mdReserved != null && Number.isFinite(mdReserved) ? mdReserved : null,
          marketDropCapacityBottles:
            mdCap != null && Number.isFinite(mdCap) ? mdCap : null,
          logisticsPalletName: palletName,
          sourcePalletId: mdSourceId,
          sourcePalletName,
        };
      }),
    );

    const slim = transformedReservations.map((r) => ({
      id: String(r.id),
      created_at: String(r.created_at),
      status: String(r.status),
      payment_status: r.payment_status != null ? String(r.payment_status) : null,
      bottle_count: Number(r.bottleCount) || 0,
      is_conditional: Boolean(r.isConditional),
      bottle_verb: r.bottleVerb as "requested" | "ordered",
      customer_pallet_label: String(r.customerPalletLabel || "Your reservation"),
      display_destination:
        r.displayDestination != null ? String(r.displayDestination) : null,
      market_drop_id:
        r.market_drop_id != null ? String(r.market_drop_id) : null,
      pallet_id: r.pallet_id != null ? String(r.pallet_id) : null,
      delivery_address: String(r.delivery_address || ""),
    }));

    const summaryGroups = buildReservationSummaryGroups(slim);

    return NextResponse.json({
      reservations: transformedReservations,
      summaryGroups,
    });
  } catch (error) {
    console.error("Reservations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
