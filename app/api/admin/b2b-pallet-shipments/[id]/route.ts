import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";
import { validateB2bPickupProducerId } from "@/lib/b2b-pallet-shipment-validation";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { data, error } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();
  const body = await request.json();

  const {
    name,
    shipped_at,
    delivered_at,
    cost_cents,
    is_active,
    pickup_producer_id,
    items,
  } = body as {
    name?: string;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cost_cents?: number | null;
    is_active?: boolean;
    pickup_producer_id?: string | null;
    items?: Array<{
      wine_id: string;
      quantity: number;
      cost_cents_override?: number | null;
    }>;
  };

  let wineIdsForPickup: string[] = [];
  if (items && Array.isArray(items)) {
    wineIdsForPickup = items
      .filter((i) => i.wine_id && i.quantity > 0)
      .map((i) => i.wine_id);
  } else if (pickup_producer_id !== undefined) {
    const { data: existingItems } = await sb
      .from("b2b_pallet_shipment_items")
      .select("wine_id")
      .eq("shipment_id", id);
    wineIdsForPickup = (existingItems ?? []).map((row) => row.wine_id as string);
  }

  if (pickup_producer_id !== undefined) {
    const pickupCheck = await validateB2bPickupProducerId(
      sb,
      pickup_producer_id,
      wineIdsForPickup,
    );
    if (!pickupCheck.ok) {
      return NextResponse.json({ error: pickupCheck.error }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name?.trim();
  if (shipped_at !== undefined) updateData.shipped_at = shipped_at || null;
  if (delivered_at !== undefined) updateData.delivered_at = delivered_at || null;
  if (cost_cents !== undefined)
    updateData.cost_cents = cost_cents != null ? cost_cents : null;
  if (is_active !== undefined) updateData.is_active = is_active === true;
  if (pickup_producer_id !== undefined) {
    updateData.pickup_producer_id = pickup_producer_id || null;
  }
  updateData.updated_at = new Date().toISOString();

  if (Object.keys(updateData).length > 1) {
    const { error: updateError } = await sb
      .from("b2b_pallet_shipments")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }
  }

  if (items && Array.isArray(items)) {
    let soldByWineId = new Map<string, number>();
    try {
      const { data: existingItems } = await sb
        .from("b2b_pallet_shipment_items")
        .select("wine_id, quantity_sold")
        .eq("shipment_id", id);
      (existingItems || []).forEach((it: { wine_id: string; quantity_sold?: number }) => {
        soldByWineId.set(it.wine_id, it.quantity_sold ?? 0);
      });
    } catch {
      /* quantity_sold column may not exist yet */
    }

    await sb.from("b2b_pallet_shipment_items").delete().eq("shipment_id", id);

    const validItems = items.filter((i) => i.wine_id && i.quantity > 0);
    if (validItems.length > 0) {
      const itemRows = validItems.map((i) => ({
        shipment_id: id,
        wine_id: i.wine_id,
        quantity: Math.max(1, Math.floor(i.quantity)),
        quantity_sold: soldByWineId.get(i.wine_id) ?? 0,
        cost_cents_override:
          i.cost_cents_override != null ? i.cost_cents_override : null,
      }));

      const { error: itemsError } = await sb
        .from("b2b_pallet_shipment_items")
        .insert(itemRows);

      if (itemsError) {
        return NextResponse.json(
          { error: itemsError.message },
          { status: 500 },
        );
      }
    }

    if (pickup_producer_id === undefined) {
      const { data: shipmentRow } = await sb
        .from("b2b_pallet_shipments")
        .select("pickup_producer_id")
        .eq("id", id)
        .maybeSingle();
      const currentPickup = shipmentRow?.pickup_producer_id as string | null;
      if (currentPickup) {
        const stillValid = await validateB2bPickupProducerId(
          sb,
          currentPickup,
          wineIdsForPickup,
        );
        if (stillValid.ok && stillValid.pickupProducerId === null) {
          await sb
            .from("b2b_pallet_shipments")
            .update({
              pickup_producer_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      }
    }
  }

  const { data: full } = await sb
    .from("b2b_pallet_shipments")
    .select(B2B_PALLET_SHIPMENT_SELECT)
    .eq("id", id)
    .single();

  return NextResponse.json(full);
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sb = getSupabaseAdmin();

  const { error } = await sb
    .from("b2b_pallet_shipments")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
