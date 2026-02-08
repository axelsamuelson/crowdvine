import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentAdmin } from "@/lib/admin-auth-server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET /api/admin/wines/[id]/pallet-stock
 * Returns B2B stock from Dirty Wine pallets for this wine.
 * Columns: pallet name, inbound stock (quantity), sold (quantity_sold), remaining
 */
export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await getCurrentAdmin();
    const user = await getCurrentUser();

    let isAdmin = !!admin;
    if (!isAdmin && user) {
      const sb = getSupabaseAdmin();
      const { data: profile } = await sb
        .from("profiles")
        .select("roles, role")
        .eq("id", user.id)
        .single();
      isAdmin =
        profile?.roles?.includes("admin") ||
        profile?.role === "admin" ||
        (user as { roles?: string[] }).roles?.includes("admin") ||
        (user as { role?: string }).role === "admin";
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { id: wineId } = await params;
    const sb = getSupabaseAdmin();

    let items: any[] = [];

    // Try with quantity_sold (after migration 076)
    const result = await sb
      .from("b2b_pallet_shipment_items")
      .select(
        `
        id,
        quantity,
        quantity_sold,
        shipment_id,
        b2b_pallet_shipments!inner(id, name, created_at, cost_cents)
      `,
      )
      .eq("wine_id", wineId);

    if (result.error) {
      // Fallback: quantity_sold or cost_cents may not exist yet
      const fallback = await sb
        .from("b2b_pallet_shipment_items")
        .select(
          `
          id,
          quantity,
          shipment_id,
          b2b_pallet_shipments!inner(id, name, created_at)
        `,
        )
        .eq("wine_id", wineId);
      if (fallback.error) {
        return NextResponse.json(
          { error: fallback.error.message },
          { status: 500 },
        );
      }
      items = (fallback.data || []).map((it: any) => ({
        ...it,
        quantity_sold: 0,
        b2b_pallet_shipments: {
          ...it.b2b_pallet_shipments,
          cost_cents: null,
        },
      }));
    } else {
      items = result.data || [];
    }

    const sorted = (items || []).sort(
      (a: any, b: any) =>
        new Date(b.b2b_pallet_shipments?.created_at ?? 0).getTime() -
        new Date(a.b2b_pallet_shipments?.created_at ?? 0).getTime(),
    );

    const shipmentIds = [...new Set(sorted.map((it: any) => it.shipment_id).filter(Boolean))];
    let totalBottlesByShipment = new Map<string, number>();
    if (shipmentIds.length > 0) {
      const { data: allItems } = await sb
        .from("b2b_pallet_shipment_items")
        .select("shipment_id, quantity")
        .in("shipment_id", shipmentIds);
      (allItems || []).forEach((row: any) => {
        const sid = row.shipment_id;
        totalBottlesByShipment.set(
          sid,
          (totalBottlesByShipment.get(sid) ?? 0) + (row.quantity ?? 0),
        );
      });
    }

    const rows = sorted.map((it: any) => {
      const shipment = it.b2b_pallet_shipments;
      const inbound = it.quantity ?? 0;
      const sold = it.quantity_sold ?? 0;
      const remaining = Math.max(0, inbound - sold);
      const palletCostCents = shipment?.cost_cents ?? 0;
      const totalBottles = totalBottlesByShipment.get(it.shipment_id) ?? 1;
      const shippingPerBottleCents =
        totalBottles > 0 ? Math.round(palletCostCents / totalBottles) : 0;

      return {
        id: it.id,
        pallet_name: shipment?.name ?? "Okänd pall",
        pallet_id: shipment?.id,
        inbound,
        sold,
        remaining,
        shipping_per_bottle_cents: shippingPerBottleCents,
        shipping_per_bottle_sek: shippingPerBottleCents / 100,
      };
    });

    const totalInbound = rows.reduce((s, r) => s + r.inbound, 0);
    const totalSold = rows.reduce((s, r) => s + r.sold, 0);
    const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

    // Weighted average shipping per bottle (by remaining stock) for B2B price calc
    const weightedSum = rows.reduce(
      (s, r) => s + (r.shipping_per_bottle_sek ?? 0) * r.remaining,
      0,
    );
    const shipping_per_bottle_sek_weighted_avg =
      totalRemaining > 0 ? weightedSum / totalRemaining : 0;

    return NextResponse.json({
      rows,
      total_inbound: totalInbound,
      total_sold: totalSold,
      total_remaining: totalRemaining,
      shipping_per_bottle_sek_weighted_avg,
    });
  } catch (err) {
    console.error("Error in pallet-stock API:", err);
    return NextResponse.json(
      { error: "Failed to fetch pallet stock" },
      { status: 500 },
    );
  }
}
