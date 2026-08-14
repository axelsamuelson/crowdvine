import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { B2B_PALLET_SHIPMENT_SELECT } from "@/lib/b2b-pallet-shipment-select";

const bodySchema = z.object({
  producer_id: z.string().uuid(),
  items: z.array(
    z.object({
      wine_id: z.string().uuid(),
      quantity: z.number().int().positive(),
    }),
  ),
});

/**
 * PUT /api/admin/b2b-pallet-shipments/[id]/producer-wines
 * Replace this producer's wines on the pallet (add / remove / change qty).
 * Other producers' items are left untouched.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: shipmentId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { producer_id: producerId, items } = parsed.data;
    const sb = getSupabaseAdmin();

    const { data: shipment, error: shipmentError } = await sb
      .from("b2b_pallet_shipments")
      .select("id")
      .eq("id", shipmentId)
      .maybeSingle();

    if (shipmentError || !shipment) {
      return NextResponse.json({ error: "Pall hittades inte" }, { status: 404 });
    }

    const wineIds = items.map((i) => i.wine_id);
    if (wineIds.length > 0) {
      const { data: wines, error: winesError } = await sb
        .from("wines")
        .select("id, producer_id")
        .in("id", wineIds);

      if (winesError) {
        return NextResponse.json(
          { error: winesError.message },
          { status: 500 },
        );
      }

      const byId = new Map(
        (wines ?? []).map((w) => [w.id as string, w.producer_id as string]),
      );
      for (const wineId of wineIds) {
        const pid = byId.get(wineId);
        if (!pid) {
          return NextResponse.json(
            { error: `Vin ${wineId} hittades inte` },
            { status: 400 },
          );
        }
        if (pid !== producerId) {
          return NextResponse.json(
            { error: "Alla viner måste tillhöra den valda producenten" },
            { status: 400 },
          );
        }
      }
    }

    const { data: existingItems, error: existingError } = await sb
      .from("b2b_pallet_shipment_items")
      .select("id, wine_id, quantity, quantity_sold, cost_cents_override, wines!inner(producer_id)")
      .eq("shipment_id", shipmentId)
      .eq("wines.producer_id", producerId);

    if (existingError) {
      console.error("[producer-wines] existing:", existingError);
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 },
      );
    }

    const existingByWine = new Map<
      string,
      {
        id: string;
        quantity_sold: number;
        cost_cents_override: number | null;
      }
    >();
    for (const row of existingItems ?? []) {
      existingByWine.set(row.wine_id as string, {
        id: row.id as string,
        quantity_sold: Number(row.quantity_sold) || 0,
        cost_cents_override:
          row.cost_cents_override != null
            ? Number(row.cost_cents_override)
            : null,
      });
    }

    const nextWineIds = new Set(wineIds);
    const toDeleteIds = Array.from(existingByWine.entries())
      .filter(([wineId]) => !nextWineIds.has(wineId))
      .map(([, row]) => row.id);

    if (toDeleteIds.length > 0) {
      const { error: deleteError } = await sb
        .from("b2b_pallet_shipment_items")
        .delete()
        .in("id", toDeleteIds);
      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }
    }

    const removedWineIds = Array.from(existingByWine.keys()).filter(
      (wineId) => !nextWineIds.has(wineId),
    );
    if (removedWineIds.length > 0) {
      await sb
        .from("b2b_pallet_producer_wine_status")
        .delete()
        .eq("shipment_id", shipmentId)
        .in("wine_id", removedWineIds);
    }

    for (const item of items) {
      const existing = existingByWine.get(item.wine_id);
      const quantity = Math.max(1, Math.floor(item.quantity));
      if (existing) {
        const { error: updateError } = await sb
          .from("b2b_pallet_shipment_items")
          .update({ quantity })
          .eq("id", existing.id);
        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 },
          );
        }
      } else {
        const { error: insertError } = await sb
          .from("b2b_pallet_shipment_items")
          .insert({
            shipment_id: shipmentId,
            wine_id: item.wine_id,
            quantity,
            quantity_sold: 0,
            cost_cents_override: null,
          });
        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 },
          );
        }
      }
    }

    const { data: full, error: fullError } = await sb
      .from("b2b_pallet_shipments")
      .select(B2B_PALLET_SHIPMENT_SELECT)
      .eq("id", shipmentId)
      .single();

    if (fullError) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(full);
  } catch (err) {
    console.error("[producer-wines] PUT:", err);
    return NextResponse.json(
      { error: "Kunde inte uppdatera viner" },
      { status: 500 },
    );
  }
}
