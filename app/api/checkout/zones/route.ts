import { NextResponse } from "next/server";
import { shipToCheckoutResponse } from "@/lib/checkout/ship-to-gate";
import { determineZones } from "@/lib/zone-matching";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { resolveActiveGeoZoneForUser } from "@/lib/market/resolve-active-geo-zone";

export async function POST(request: Request) {
  const shipBlock = shipToCheckoutResponse(request);
  if (shipBlock) return shipBlock;
  try {
    const body = await request.json();
    const { cartItems, deliveryAddress } = body;

    console.log("🌍 [ZONES API] Received request:", {
      cartItemsCount: cartItems?.length,
      deliveryAddress,
    });

    if (!cartItems || !deliveryAddress) {
      return NextResponse.json(
        { error: "Missing cart items or delivery address" },
        { status: 400 },
      );
    }

    const user = await getCurrentUser();
    let preferredDeliveryZoneId: string | null = null;
    if (user?.id) {
      const active = await resolveActiveGeoZoneForUser(user.id);
      preferredDeliveryZoneId = active.defaultDeliveryZoneId;
    }

    const zones = await determineZones(cartItems, deliveryAddress, {
      preferredDeliveryZoneId,
    });

    let palletsOut = zones.pallets || [];
    const palletIds = palletsOut
      .map((p) => p.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    // Region hot path already joins current_pickup_producer + shipping_region_id.
    // Skip a redundant enrich round-trip when every pallet already has them.
    const needsEnrich = palletsOut.some(
      (p) =>
        p.current_pickup_producer === undefined ||
        p.shipping_region_id === undefined,
    );

    if (palletIds.length > 0 && needsEnrich) {
      const sb = getSupabaseAdmin();
      const { data: rows, error: enrichErr } = await sb
        .from("pallets")
        .select(
          `
          id,
          shipping_region_id,
          status,
          current_pickup_producer:producers!current_pickup_producer_id(id, name)
        `,
        )
        .in("id", palletIds);

      if (!enrichErr && rows?.length) {
        type EnrichedRow = {
          id: string;
          shipping_region_id?: string | null;
          status?: string | null;
          current_pickup_producer?: {
            id: string;
            name: string | null;
          } | null;
        };
        const byId = new Map<string, EnrichedRow>();
        for (const r of rows) {
          const row = r as unknown as EnrichedRow;
          byId.set(row.id, row);
        }
        palletsOut = palletsOut.map((p) => {
          const row = byId.get(p.id);
          if (!row) return p;
          return {
            ...p,
            shipping_region_id:
              row.shipping_region_id ?? p.shipping_region_id ?? null,
            status: row.status ?? p.status ?? null,
            current_pickup_producer:
              row.current_pickup_producer ?? p.current_pickup_producer ?? null,
          };
        });
      } else if (enrichErr) {
        console.warn(
          "[ZONES API] Pallet enrich failed (non-fatal):",
          enrichErr.message,
        );
      }
    }

    // Skip market_drop lookup on this hot path: checkout UI does not read
    // marketDropId from /zones (confirm resolves drops server-side). That
    // round-trip added ~0.4s after postal entry for the Delad pall card.
    palletsOut = palletsOut.map((p) => ({
      ...p,
      marketDropId: p.marketDropId ?? null,
      sourcePalletId: p.id,
    }));

    const primary = palletsOut[0];
    const topMarketDropId = primary?.marketDropId ?? null;
    const topSourcePalletId =
      typeof primary?.id === "string" && primary.id ? primary.id : null;

    console.log("🌍 [ZONES API] Returning zones:", {
      pickupZoneId: zones.pickupZoneId,
      pickupZoneName: zones.pickupZoneName,
      deliveryZoneId: zones.deliveryZoneId,
      deliveryZoneName: zones.deliveryZoneName,
      palletsCount: palletsOut.length || 0,
      marketDropId: topMarketDropId,
      sourcePalletId: topSourcePalletId,
    });

    return NextResponse.json({
      pickupZoneId: zones.pickupZoneId,
      deliveryZoneId: zones.deliveryZoneId,
      pickupZoneName: zones.pickupZoneName,
      deliveryZoneName: zones.deliveryZoneName,
      availableDeliveryZones: zones.availableDeliveryZones || [],
      pallets: palletsOut,
      marketDropId: topMarketDropId,
      sourcePalletId: topSourcePalletId,
      ...(zones.noDeliveryZone
        ? {
            error: zones.noDeliveryZone.error,
            message: zones.noDeliveryZone.message,
            address: zones.noDeliveryZone.address,
          }
        : {}),
    });
  } catch (error) {
    console.error("❌ [ZONES API] Zone determination error:", error);
    return NextResponse.json(
      { error: "Failed to determine zones" },
      { status: 500 },
    );
  }
}
