import { NextResponse } from "next/server";
import { determineZones } from "@/lib/zone-matching";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
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

    const zones = await determineZones(cartItems, deliveryAddress);

    let palletsOut = zones.pallets || [];
    const palletIds = palletsOut
      .map((p) => p.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (palletIds.length > 0) {
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
          const row = r as EnrichedRow;
          byId.set(row.id, row);
        }
        palletsOut = palletsOut.map((p) => {
          const row = byId.get(p.id);
          if (!row) return p;
          return {
            ...p,
            shipping_region_id: row.shipping_region_id ?? null,
            status: row.status ?? p.status ?? null,
            current_pickup_producer: row.current_pickup_producer ?? null,
          };
        });
      } else if (enrichErr) {
        console.warn(
          "[ZONES API] Pallet enrich failed (non-fatal):",
          enrichErr.message,
        );
      }
    }

    console.log("🌍 [ZONES API] Returning zones:", {
      pickupZoneId: zones.pickupZoneId,
      pickupZoneName: zones.pickupZoneName,
      deliveryZoneId: zones.deliveryZoneId,
      deliveryZoneName: zones.deliveryZoneName,
      palletsCount: palletsOut.length || 0,
    });

    return NextResponse.json({
      pickupZoneId: zones.pickupZoneId,
      deliveryZoneId: zones.deliveryZoneId,
      pickupZoneName: zones.pickupZoneName,
      deliveryZoneName: zones.deliveryZoneName,
      availableDeliveryZones: zones.availableDeliveryZones || [],
      pallets: palletsOut,
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
