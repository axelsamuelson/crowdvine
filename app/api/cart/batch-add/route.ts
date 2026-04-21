import { NextResponse } from "next/server";
import { CartService } from "@/src/lib/cart-service";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type BatchItem = { variantId?: string; quantity?: number };

function baseWineId(variantId: string): string {
  return variantId.replace(/-default$/i, "");
}

/**
 * POST /api/cart/batch-add
 * Body: { items: { variantId: string, quantity: number }[] }
 * Adds each line via CartService.addItem; returns full cart from CartService.getCart().
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawItems: BatchItem[] = Array.isArray(body?.items) ? body.items : [];

    if (rawItems.length === 0) {
      return NextResponse.json(
        { error: "items array is required" },
        { status: 400 },
      );
    }

    const merged = new Map<string, number>();
    for (const row of rawItems) {
      if (!row?.variantId || typeof row.variantId !== "string") continue;
      const q = Math.max(
        0,
        Math.min(6, parseInt(String(row.quantity), 10) || 0),
      );
      if (q <= 0) continue;
      const wineId = baseWineId(row.variantId.trim());
      merged.set(wineId, (merged.get(wineId) ?? 0) + q);
    }

    const items = [...merged.entries()].map(([wineId, quantity]) => ({
      wineId,
      quantity,
    }));

    if (items.some((i) => i.quantity > 6)) {
      return NextResponse.json(
        { error: "At most 6 bottles per wine in a mixed case" },
        { status: 400 },
      );
    }

    const total = items.reduce((s, i) => s + i.quantity, 0);
    if (total !== 6) {
      return NextResponse.json(
        { error: "Mixed case must contain exactly 6 bottles" },
        { status: 400 },
      );
    }

    const wineIds = [...new Set(items.map((i) => i.wineId))];
    const sb = getSupabaseAdmin();
    const { data: wines, error: wErr } = await sb
      .from("wines")
      .select("id, producer_id, is_live")
      .in("id", wineIds);

    if (wErr || !wines?.length) {
      return NextResponse.json(
        { error: "Could not validate wines" },
        { status: 400 },
      );
    }

    if (wines.length !== wineIds.length) {
      return NextResponse.json(
        { error: "One or more wines were not found" },
        { status: 400 },
      );
    }

    const producerIds = new Set(
      wines.map((w: any) => w.producer_id).filter(Boolean),
    );
    if (producerIds.size !== 1) {
      return NextResponse.json(
        { error: "All wines must be from the same producer" },
        { status: 400 },
      );
    }

    for (const w of wines as any[]) {
      if (w.is_live === false) {
        return NextResponse.json(
          { error: "One or more wines are not available" },
          { status: 400 },
        );
      }
    }

    const producerId = [...producerIds][0] as string;
    const { data: producer } = await sb
      .from("producers")
      .select("is_live")
      .eq("id", producerId)
      .maybeSingle();
    if (producer && (producer as any).is_live === false) {
      return NextResponse.json(
        { error: "Producer is not available" },
        { status: 400 },
      );
    }

    for (const { wineId, quantity } of items) {
      const cart = await CartService.addItem(wineId, quantity);
      if (!cart) {
        return NextResponse.json(
          { error: "Failed to update cart" },
          { status: 500 },
        );
      }
    }

    const cart = await CartService.getCart();
    if (!cart) {
      return NextResponse.json(
        { error: "Failed to load cart" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, cart });
  } catch (e) {
    console.error("[batch-add]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
